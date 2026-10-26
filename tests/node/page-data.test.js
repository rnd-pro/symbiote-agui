import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { on, once } from 'node:events';
import { WebSocket } from 'ws';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { temporaryState } from './state-fixture.js';
import { dataHtml, dataCommit } from './data-fixture.js';
import { writeFile } from 'node:fs/promises';
import { definitionPaths } from '../../src/library/paths.js';
import { updateMetadata, metadataPath } from '../../src/metadata/store.js';
import { sampleMetadata } from './metadata-fixture.js';

/**
 * @param {WebSocket} socket
 * @param {(entry: any) => boolean} matches
 */
async function message(socket, matches) {
  for await (let [data] of on(socket, 'message', { signal: AbortSignal.timeout(5_000) })) {
    let parsed = JSON.parse(data.toString());
    if (matches(parsed)) { return parsed; }
  }
}

/** @param {import('node:test').TestContext} t */
async function setup(t) {
  let state = await temporaryState();
  let runtime = new SessionRuntime({ sessionId: 'page-data', instanceId: randomUUID(), controlToken: '', pid: process.pid, launcherPid: process.pid });
  t.after(async () => { await runtime.close(); await state.close(); });
  let saved = await prepareCachedMarkup('page-data', dataHtml);
  try { await saved.commit(); } finally { await saved.discard(); }
  await runtime.start(new AbortController().signal);
  let pages = runtime.pages;
  let access = runtime.access;
  assert.ok(pages && access && runtime.record.url);
  let origin = new URL(runtime.record.url).origin;
  return {
    runtime, pages, access,
    async connect(viewer = false) {
      let socket = new WebSocket(`${origin.replace('http:', 'ws:')}${access.socketPath}${viewer ? '?mode=viewer' : ''}`, { origin });
      let rendered = viewer ? undefined : message(socket, (entry) => entry.type === 'render');
      socket.on('message', (data) => {
        let entry = JSON.parse(data.toString());
        if (entry.type === 'render') { socket.send(JSON.stringify({ type: 'result', id: entry.id })); }
      });
      await once(socket, 'open');
      if (rendered) { await rendered; await runtime.updates; }
      return socket;
    },
  };
}

test('data commits and receipt recovery use the existing socket without replay or ordinary event loss', async (t) => {
  let { runtime, connect } = await setup(t);
  let socket = await connect();
  let input = dataCommit(runtime.data.status());
  let accepted = message(socket, (entry) => entry.type === 'data-result' && entry.result.state === 'committed');
  socket.send(JSON.stringify({ type: 'event', name: 'ordinary-edit', data: { value: 1 } }));
  socket.send(JSON.stringify({ type: 'data-commit', commit: input }));
  let result = (await accepted).result;
  assert.equal(result.commitId, input.commitId);
  assert.equal(runtime.events.drain().events[0].name, 'ordinary-edit');
  socket.close();
  await once(socket, 'close');
  let commits = 0;
  runtime.data.on('result', () => { commits += 1; });
  socket = await connect();
  let reference = { commitId: input.commitId, instanceId: input.instanceId, markupRevision: input.markupRevision };
  let recovered = message(socket, (entry) => entry.type === 'data-result');
  socket.send(JSON.stringify({ type: 'data-read', references: [reference] }));
  assert.deepEqual((await recovered).result, result);
  let duplicate = message(socket, (entry) => entry.type === 'data-result');
  socket.send(JSON.stringify({ type: 'data-commit', commit: input }));
  assert.deepEqual((await duplicate).result, result);
  assert.equal(commits, 0);
});

test('pending page commands reject commits immediately but allow receipt queries', async (t) => {
  let { runtime, pages, connect } = await setup(t);
  let socket = await connect();
  let [peer] = pages.clients;
  assert.ok(peer);
  let received = message(socket, (entry) => entry.type === 'tools');
  let pending = pages.request(peer, { type: 'tools' });
  let command = await received;
  let rejected = message(socket, (entry) => entry.type === 'data-result');
  let input = dataCommit(runtime.data.status());
  socket.send(JSON.stringify({ type: 'data-commit', commit: input }));
  assert.equal((await rejected).result.failure.code, 'PAGE_BUSY');
  assert.equal(runtime.data.pending, 0);
  let queried = message(socket, (entry) => entry.type === 'data-result');
  socket.send(JSON.stringify({ type: 'data-read', references: [{ commitId: input.commitId, instanceId: input.instanceId, markupRevision: input.markupRevision }] }));
  assert.equal((await queried).result.state, 'unknown');
  socket.send(JSON.stringify({ type: 'result', id: command.id, result: {} }));
  await pending;
});

test('viewers cannot commit or query private snapshots and invalid targets cannot become writes', async (t) => {
  let { runtime, pages, access, connect } = await setup(t);
  access.sharing = true;
  pages.shared.enable(0);
  let user = await connect();
  for (let type of [
    'data-commit',
    'data-read',
    'session-info-read',
  ]) {
    let viewer = await connect(true);
    let closed = once(viewer, 'close');
    let input = {
      'data-commit': {
        type,
        commit: dataCommit(runtime.data.status()),
      },
      'data-read': {
        type,
        references: [],
      },
      'session-info-read': {
        type,
        id: randomUUID(),
      },
    }[type];
    viewer.send(JSON.stringify(input));
    assert.equal((await closed)[0], 1008);
  }
  let input = dataCommit(runtime.data.status(), { theme: 'dark' });
  let denied = message(user, (entry) => entry.type === 'data-result' && entry.result.state === 'rejected');
  user.send(JSON.stringify({ type: 'data-commit', commit: input }));
  assert.equal((await denied).result.failure.code, 'INVALID_TARGET');
  assert.equal(runtime.data.raw, undefined);
});

test('session information reads fresh description and metadata without private worker fields or storage errors', async (t) => {
  let {
    connect,
  } = await setup(t);
  let socket = await connect();
  let paths = definitionPaths('page-data');
  let metadata = sampleMetadata();
  await updateMetadata('page-data', () => metadata);
  await writeFile(paths.descriptionPath, '# Current description');
  async function read() {
    let id = randomUUID();
    let result = message(socket, (entry) => entry.type === 'session-info' && entry.id === id);
    socket.send(JSON.stringify({
      type: 'session-info-read',
      id,
    }));
    return (await result).info;
  }
  assert.deepEqual(await read(), {
    sessionId: 'page-data',
    description: '# Current description',
    metadata,
  });
  await writeFile(paths.descriptionPath, '# Revised description');
  assert.equal((await read()).description, '# Revised description');
  await writeFile(metadataPath('page-data'), '{invalid');
  assert.equal(await read(), null);
});
