import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { connectorFixture } from './connector-fixture.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { SessionConnectors } from '../../src/connectors/session.js';
import { withStorageFolder } from '../../src/config/storage-scope.js';
import { saveDefinition } from '../../src/library/catalog.js';
import { definitionPaths } from '../../src/library/paths.js';
import { core } from '../../src/connectors/core.js';

test('public origins, forwarded local headers, viewers, and forged roles cannot invoke backends', {
  timeout: 30000,
}, async (t) => {
  let f = await connectorFixture(t);
  await f.attach();
  await f.grant('backend', 'agui');
  let record = {
    sessionId: 'backend',
    instanceId: randomUUID(),
    controlToken: 'a'.repeat(64),
    pid: process.pid,
    launcherPid: process.pid,
  };
  let runtime = new SessionRuntime(record);
  await runtime.start(new AbortController().signal);
  f.cleanup(() => runtime.close());
  assert.ok(runtime.access && runtime.pages && runtime.record.url);
  runtime.access.sharing = true;
  runtime.access.publicOrigin = 'https://public.example';
  runtime.pages.shared.enable(0);
  let local = new URL(runtime.record.url).origin;
  let endpoint = new URL(`${runtime.access.socketPath}`, local);
  endpoint.protocol = 'ws:';
  for (let headers of [
    {
      origin: 'https://public.example',
      host: 'public.example',
    },
    {
      origin: local,
      host: new URL(local).host,
      'cf-ray': 'forwarded-test',
    },
  ]) {
    let socket = new WebSocket(endpoint, {
      headers,
    });
    socket.on('message', (raw) => {
      let message = JSON.parse(raw.toString());
      if (message.type === 'render') { socket.send(JSON.stringify({
        type: 'result',
        id: message.id,
      })); }
    });
    await new Promise((resolve) => socket.once('open', resolve));
    await delay(30);
    let closed = new Promise((resolve) => socket.once('close', resolve));
    socket.send(JSON.stringify({
      type: 'connector-call',
      call: {
        action: 'save',
        requestId: randomUUID(),
        instanceId: record.instanceId,
        markupRevision: 0,
        revision: f.prepared.revision,
        input: {
          value: 'must not run',
        },
      },
    }));
    await closed;
  }
  let viewerUrl = new URL(endpoint);
  viewerUrl.searchParams.set('mode', 'viewer');
  let viewer = new WebSocket(viewerUrl, {
    origin: local,
  });
  await new Promise((resolve) => viewer.once('open', resolve));
  let closed = new Promise((resolve) => viewer.once('close', resolve));
  viewer.send(JSON.stringify({
    type: 'connector-call',
    role: 'user',
    source: 'agent',
    call: {},
  }));
  await closed;
  await assert.rejects(readFile(f.log), {
    code: 'ENOENT',
  });
});

test('requirements changed while stopped cannot resurrect an older grant after a later revert', async (t) => {
  let f = await connectorFixture(t);
  await f.attach();
  await f.grant('backend', 'agent');
  let policyPath = definitionPaths('backend').connectorPath;
  let original = await readFile(policyPath, 'utf8');
  let before = (await core.readAuthority(f.coreRoot)).grants.find((entry) => !entry.revoked);
  assert.ok(before);
  await writeFile(join(f.sourceDirectory, 'description.md'), '# Changed requirement\n');
  let prepared = (await f.registry.prepare('example.records.save')).result;
  await f.registry.bind('example.records.save', prepared.scriptId, prepared.revision);
  let changed = JSON.parse(original);
  changed.actions[0].revision = prepared.revision;
  await writeFile(policyPath, JSON.stringify(changed));
  let instanceId = randomUUID();
  let service = new SessionConnectors('backend', () => ({
    instanceId,
    markupRevision: 0,
  }));
  await service.initialize();
  assert.equal((await core.readAuthority(f.coreRoot)).grants.find((entry) => entry.id === before.id)?.revoked, true);
  await writeFile(policyPath, original);
  await f.registry.bind('example.records.save', f.prepared.scriptId, f.prepared.revision);
  await service.reload();
  let result = await service.admit({
    action: 'save',
    requestId: randomUUID(),
    instanceId,
    markupRevision: 0,
    revision: f.prepared.revision,
    input: {
      value: 'must remain denied',
    },
  }, 'agent').promise;
  assert.equal(result.code, 'ACCESS_DENIED');
});

test('an admitted call keeps its reviewed revision when the registry alias changes during resolution', async (t) => {
  let f = await connectorFixture(t);
  await f.attach();
  await f.grant('backend', 'agent');
  await writeFile(join(f.sourceDirectory, 'description.md'), '# Next revision\n');
  let next = (await f.registry.prepare('example.records.save')).result;
  let instanceId = randomUUID();
  let service = new SessionConnectors('backend', () => ({
    instanceId,
    markupRevision: 0,
  }));
  await service.initialize();
  let show = core.FileRegistry.prototype.show;
  let advance = true;
  /**
   * @this {import('../../types/connectors.js').CoreRegistry}
   * @param {string} address
   */
  async function showAndAdvance(address) {
    let resolved = await show.call(this, address);
    if (advance) {
      advance = false;
      await f.registry.bind('example.records.save', next.scriptId, next.revision);
    }
    return resolved;
  }
  t.mock.method(core.FileRegistry.prototype, 'show', showAndAdvance);
  let requestId = randomUUID();
  let result = await service.admit({
    action: 'save',
    requestId,
    instanceId,
    markupRevision: 0,
    revision: f.prepared.revision,
    input: {
      value: 'pinned',
    },
  }, 'agent').promise;
  assert.equal(result.state, 'completed');
  assert.equal(result.revision, f.prepared.revision);
  assert.equal((await f.registry.show('example.records.save')).binding.revision, next.revision);
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 1);
});

test('identically named sessions in different projects cannot share grants or read each other receipts', async (t) => {
  let f = await connectorFixture(t);
  let a = join(f.directory, 'project-a');
  let b = join(f.directory, 'project-b');
  await mkdir(a);
  await mkdir(b);
  /** @param {string} folder */
  async function setup(folder) {
    return withStorageFolder(folder, async () => {
      await saveDefinition('same', f.html);
      let service = new SessionConnectors('same', () => ({
        instanceId: randomUUID(),
        markupRevision: 0,
      }));
      // One stable identity belongs to this worker fixture.
      let instanceId = randomUUID();
      service.identity = () => ({
        instanceId,
        markupRevision: 0,
      });
      await service.initialize();
      await service.configure({
        command: 'attach',
        action: 'save',
        registry: f.collection,
        address: 'example.records.save',
        cwd: process.cwd(),
      });
      return service;
    });
  }
  let left = await setup(a);
  let right = await setup(b);
  await withStorageFolder(a, () => left.configure({
    command: 'grant',
    action: 'save',
    revision: f.prepared.revision,
    source: 'agent',
  }));
  let requestId = randomUUID();
  /** @param {SessionConnectors} service */
  let call = (service) => ({
    action: 'save',
    requestId,
    instanceId: service.identity().instanceId,
    markupRevision: 0,
    revision: f.prepared.revision,
    input: {
      value: 'scoped',
    },
  });
  let completed = await withStorageFolder(a, () => left.admit(call(left), 'agent').promise);
  assert.equal(completed.state, 'completed');
  let denied = await withStorageFolder(b, () => right.admit(call(right), 'agent').promise);
  assert.equal(denied.code, 'ACCESS_DENIED');
  await assert.rejects(withStorageFolder(b, () => right.read({
    action: 'save',
    requestId,
    instanceId: right.identity().instanceId,
  })));
});
