import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import test from 'node:test';
import { WebSocket } from 'ws';
import { temporaryState } from './state-fixture.js';
import { tunnelFixture } from './tunnel-fixture.js';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';
import { withStorageFolder } from '../../src/config/storage-scope.js';
import { ensureSessionStarted } from '../../src/sessions/start.js';
import { stopSession } from '../../src/sessions/lifecycle.js';
import { readSession, reserveSession, writeSession, releaseSession } from '../../src/sessions/store.js';
import { requestSession } from '../../src/sessions/client.js';
import { PAGE_DISCONNECT_CODE } from '../../src/transport/constants.js';
import { startControlServer } from '../../src/server/control-server.js';
import { closeServer } from '../../src/shared/server.js';

/**
 * @param {ManagerOperations} manager
 * @param {import('../../types/manager.js').ManagerOperation} operation
 * @param {Partial<import('../../types/manager.js').ManagerRequest>} [options]
 */
function dispatch(manager, operation, options = {}) {
  return manager.dispatch({
    id: randomUUID(),
    operation,
    ...options,
  });
}

/**
 * @param {string} url
 * @param {string} [mode]
 */
async function connect(url, mode) {
  let endpoint = new URL('socket', url);
  endpoint.protocol = 'ws:';
  if (mode) { endpoint.searchParams.set('mode', mode); }
  let socket = new WebSocket(endpoint, {
    origin: new URL(url).origin,
  });
  socket.on('message', (data) => {
    let message = JSON.parse(data.toString());
    if (message.id) { socket.send(JSON.stringify({
      type: 'result',
      id: message.id,
      result: {},
    })); }
  });
  await once(socket, 'open');
  return socket;
}

test('connection operations reject arbitrary scope paths, mixed options and unconfirmed disconnects', () => {
  for (let request of [
    {
      operation: 'connections',
      folder: '/tmp',
    },
    {
      operation: 'open public',
      sessionId: 'desk',
      projectId: '../escape',
    },
    {
      operation: 'disconnect page',
      projectId: 'default',
      sessionId: 'desk',
      instanceId: randomUUID(),
      pageId: randomUUID(),
    },
    {
      operation: 'snapshot',
      pageId: randomUUID(),
    },
  ]) { assert.throws(() => validateManagerRequest({
    id: randomUUID(),
    ...request,
  })); }
});

test('global connections include unregistered project workers, isolate duplicate IDs and reject stale identities', {
  timeout: 30_000,
}, async (t) => {
  let state = await temporaryState();
  let folders = [
    undefined,
    join(state.directory, 'project-one'),
    join(state.directory, 'project-two'),
  ];
  t.after(async () => {
    for (let folder of folders) { await withStorageFolder(folder, () => stopSession('desk')); }
    await state.close();
  });
  for (let folder of folders) {
    if (folder) { await mkdir(folder); }
    await withStorageFolder(folder, () => ensureSessionStarted('desk', false));
  }
  let manager = new ManagerOperations();
  let listing = (await dispatch(manager, 'connections')).connections;
  assert.ok(listing);
  assert.equal(listing.sessions.length, 3);
  assert.equal(new Set(listing.sessions.map((entry) => entry.project.id)).size, 3);
  assert.equal(listing.sessions.every((entry) => entry.manageable), true);
  assert.equal(JSON.stringify(listing).includes('controlToken'), false);
  let target = listing.sessions.find((entry) => entry.project.folder === folders[1]);
  assert.ok(target?.url);
  let browser = await connect(target.url);
  t.after(() => browser.terminate());
  listing = (await dispatch(manager, 'connections')).connections;
  let entry = listing?.sessions.find((entry) => entry.instanceId === target.instanceId);
  assert.ok(entry?.pages[0]);
  let stale = await dispatch(manager, 'disconnect page', {
    projectId: entry.project.id,
    sessionId: entry.sessionId,
    instanceId: randomUUID(),
    pageId: entry.pages[0].pageId,
    confirm: true,
  });
  assert.equal(stale.ok, false);
  assert.equal(browser.readyState, WebSocket.OPEN);
  let closed = once(browser, 'close');
  let result = await dispatch(manager, 'disconnect page', {
    projectId: entry.project.id,
    sessionId: entry.sessionId,
    instanceId: entry.instanceId,
    pageId: entry.pages[0].pageId,
    confirm: true,
  });
  assert.equal(result.ok, true);
  assert.equal((await closed)[0], PAGE_DISCONNECT_CODE);
  let after = (await dispatch(manager, 'connections')).connections;
  assert.equal(after?.sessions.length, 3, 'Disconnecting a browser keeps all workers running.');
  assert.equal(after?.sessions.find((entry) => entry.instanceId === target.instanceId)?.pages.length, 0);
});

test('public opening checks and renews once, keeps role-free URLs, and tunnel stop preserves workers and local clients', {
  timeout: 30_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  let originalFetch = globalThis.fetch;
  await import(pathToFileURL(join(state.directory, 'tunnel-fetch.mjs')).href);
  t.after(async () => {
    await stopSession('desk');
    globalThis.fetch = originalFetch;
    fixture.close();
    await state.close();
  });
  let started = await ensureSessionStarted('desk', false);
  let record = await readSession('desk');
  assert.ok(record && started.url);
  await requestSession(record, 'share');
  let manager = new ManagerOperations();
  let pid = record.pid;
  let publicOptions = {
    projectId: 'default',
    sessionId: 'desk',
  };
  let first = await connect(started.url, 'viewer');
  let user = await connect(started.url);
  let second = await connect(started.url);
  t.after(() => { first.terminate(); user.terminate(); second.terminate(); });
  let entry = (await dispatch(manager, 'connections')).connections?.sessions[0];
  assert.ok(entry);
  assert.deepEqual(entry.pages.map((page) => page.role), [
    'viewer',
    'user',
    'viewer',
  ], 'Explicit viewer stays read-only even when first; other tabs use first-eligible election.');
  let count = (await fixture.pids()).length;
  await fixture.setOrigin('https://renewed-open.trycloudflare.com');
  let opened = await dispatch(manager, 'open public', publicOptions);
  assert.equal(opened.ok, true);
  assert.equal(opened.openUrl, 'https://renewed-open.trycloudflare.com/desk/');
  assert.equal((await fixture.pids()).length, count + 1);
  let viewer = await dispatch(manager, 'open public', {
    ...publicOptions,
    viewer: true,
  });
  assert.equal(viewer.openUrl, `${opened.openUrl}?mode=viewer`);
  assert.equal((await fixture.pids()).length, count + 1, 'A healthy tunnel is reused.');
  let stopped = await dispatch(manager, 'stop tunnel', {
    ...publicOptions,
    instanceId: entry.instanceId,
    confirm: true,
  });
  assert.equal(stopped.ok, true);
  assert.equal(stopped.sessions?.[0].pid, pid);
  assert.equal(stopped.sessions?.[0].publicUrl, undefined);
  assert.equal(user.readyState, WebSocket.OPEN);
  assert.equal((await dispatch(manager, 'open public', publicOptions)).ok, false, 'Opening does not undo an intentional tunnel stop.');
  await requestSession(record, 'share');
  await fixture.setOrigin('https://failed-open.trycloudflare.com');
  await fixture.setMode('fail');
  let failed = await dispatch(manager, 'open public', publicOptions);
  assert.equal(failed.ok, false);
  assert.equal(failed.openUrl, undefined);
  assert.equal(user.readyState, WebSocket.OPEN);
});

test('older and unreachable workers remain visible without exposing private control identities', async (t) => {
  let state = await temporaryState();
  let record = await reserveSession('legacy');
  let broken = await reserveSession('unreachable');
  let pageId = randomUUID();
  let status = {
    sessionId: record.sessionId,
    state: /** @type {const} */ ('ready'),
  };
  let control = await startControlServer(record, () => status, async () => {}, {
    tools: async () => ({
      ...status,
      toolResponse: {
        action: 'pages',
        pages: [
          {
            pageId,
            url: 'http://127.0.0.1/legacy/',
            title: 'Legacy page',
            ready: true,
          },
        ],
      },
    }),
  });
  t.after(async () => {
    await closeServer(control.server);
    await releaseSession(record);
    await releaseSession(broken);
    await state.close();
  });
  record.controlUrl = control.url;
  broken.controlUrl = control.url;
  await writeSession(record);
  await writeSession(broken);
  let result = await dispatch(new ManagerOperations(), 'connections');
  assert.equal(result.connections?.sessions.length, 2);
  let legacy = result.connections?.sessions.find((entry) => entry.sessionId === record.sessionId);
  assert.equal(legacy?.pages[0]?.pageId, pageId);
  assert.equal(legacy?.manageable, false);
  assert.match(legacy?.error || '', /inspection only/);
  assert.ok(result.connections?.sessions.find((entry) => entry.sessionId === broken.sessionId)?.error);
  assert.equal(JSON.stringify(result).includes(record.controlToken), false);
  assert.equal(JSON.stringify(result).includes(control.url), false);
});
