import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { publicConnectorFixture, publicMessage } from './connector-public-fixture.js';
import { connectorFixture } from './connector-fixture.js';
import { cli } from '../browser/helpers.js';
import { connectorPrivatePath } from '../../src/connectors/store.js';
import { core } from '../../src/connectors/core.js';
import { validateExposureOptions } from '../../src/connectors/public-policy.js';
import { invalidateConnectorAuthority } from '../../src/connectors/invalidate.js';

test('public capabilities authenticate exact origins and isolate resources, local grants, actors and receipts', {
  timeout: 30000,
}, async (t) => {
  let f = await publicConnectorFixture(t);
  let a = await f.expose();
  let b = await f.expose({
    actor: 'another-actor',
    resources: {
      value: 'other',
    },
  });
  let socket = await f.connect();
  let status = publicMessage(socket, 'connector-status');
  assert.equal(await f.authorize(socket, 'x'.repeat(43)), false);
  assert.equal((await status).connectors.available, false);
  status = publicMessage(socket, 'connector-status');
  assert.equal(await f.authorize(socket, a.token), true);
  assert.equal((await status).connectors.actions[0].name, 'save');
  assert.equal((await f.call(socket, {
    value: 'outside-resource',
  })).state, 'rejected');
  let id = randomUUID();
  let result = await f.call(socket, undefined, id);
  assert.equal(result.state, 'completed');
  assert.deepEqual(await f.call(socket, undefined, id), result);
  assert.deepEqual(await f.call(socket, undefined, id, true), result);
  let another = socket;
  assert.equal(await f.authorize(another, b.token), true);
  let foreign = await f.call(another, undefined, id, true);
  assert.equal(foreign.state, 'unknown');
  assert.equal(foreign.value, undefined);
  assert.equal((await f.call(another, {
    value: 'other',
  })).state, 'completed');
  await assert.rejects(f.runtime.connectors.read({
    action: 'save',
    requestId: id,
    instanceId: f.runtime.record.instanceId,
  }));
  let receipt = await core.getReceipt(f.coreRoot, id);
  assert.ok(receipt.scope.startsWith('agui-public:'));
  let raw = await readFile(connectorPrivatePath('backend'), 'utf8');
  assert.ok(!raw.includes(a.token));
  let inspection = JSON.stringify(await f.runtime.connectors.configure({
    command: 'status',
  }));
  assert.ok(!inspection.includes(a.token));
  assert.ok(!inspection.includes('tokenHash'));
  let viewer = await f.connect(true);
  let closed = once(viewer, 'close');
  viewer.send(JSON.stringify({
    type: 'connector-authorize',
    action: 'save',
    token: a.token,
  }));
  await closed;
  await f.runtime.connectors.configure({
    command: 'unexpose',
    action: 'save',
  });
  assert.equal((await f.call(socket)).state, 'rejected');
  assert.equal(await f.authorize(another, b.token), false);
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 2);
  let ended = once(socket, 'close');
  socket.close();
  await ended;
  let next = await f.expose();
  let local = new URL(f.runtime.record.url || '').origin;
  let localSocket = await f.connect(false, local);
  assert.equal(await f.authorize(localSocket, next.token), false);
});

test('public rate limits survive reconnects and cover receipt reads', {
  timeout: 30000,
}, async (t) => {
  let f = await publicConnectorFixture(t);
  let entry = await f.expose({
    requestsPerMinute: 2,
  });
  let socket = await f.connect();
  assert.equal(await f.authorize(socket, entry.token), true);
  let id = randomUUID();
  assert.equal((await f.call(socket, undefined, id)).state, 'completed');
  assert.equal((await f.call(socket, undefined, id, true)).state, 'completed');
  let closed = once(socket, 'close');
  socket.close();
  await closed;
  socket = await f.connect();
  assert.equal(await f.authorize(socket, entry.token), true);
  assert.equal((await f.call(socket, undefined, id, true)).state, 'unknown');
  assert.equal((await f.call(socket)).state, 'rejected');
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 1);
});

test('expiry cancels active public work and lifecycle invalidation revokes its separate grants', {
  timeout: 30000,
}, async (t) => {
  let f = await publicConnectorFixture(t);
  let entry = await f.expose({
    expiresInSeconds: 2,
  });
  let socket = await f.connect();
  assert.equal(await f.authorize(socket, entry.token), true);
  let id = randomUUID();
  let result = await f.call(socket, {
    value: 'allowed',
    delay: 5000,
  }, id);
  assert.ok([
    'rejected',
    'unknown',
  ].includes(result.state));
  let receipt = await core.getReceipt(f.coreRoot, id);
  assert.equal(receipt.state, 'unknown');
  assert.equal(await f.authorize(socket, entry.token), false);
  await assert.rejects(readFile(f.log), {
    code: 'ENOENT',
  });
  let next = await f.expose();
  await invalidateConnectorAuthority('backend');
  assert.equal((await core.readAuthority(f.coreRoot)).grants.some((grant) => !grant.revoked), false);
  // A capability cannot restore a revoked runner grant, even if still in private metadata.
  assert.equal(await f.authorize(socket, next.token), true);
  assert.equal((await f.call(socket)).code, 'ACCESS_DENIED');
});

test('CLI exposes reviewed actions while stopped and running without persisting bearer tokens', {
  timeout: 30000,
}, async (t) => {
  let f = await connectorFixture(t);
  await f.attach();
  f.cleanup(() => cli('stop', 'backend').catch(() => {}));
  let file = join(f.directory, 'public-policy.json');
  let policy = {
    revision: f.prepared.revision,
    actor: 'example-actor',
    origin: 'https://public.example',
    resources: {
      value: 'allowed',
    },
    expiresInSeconds: 600,
    requestsPerMinute: 10,
  };
  await writeFile(file, JSON.stringify(policy));
  let result = await cli('connector', 'expose', 'backend', 'save', '--file', file);
  assert.match(result.connectorControl.token, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(!(await readFile(connectorPrivatePath('backend'), 'utf8')).includes(result.connectorControl.token));
  await cli('start', 'backend', '--no-open');
  let status = await cli('connector', 'status', 'backend');
  assert.equal(status.connectorControl.exposures.length, 1);
  await cli('connector', 'unexpose', 'backend', 'save');
  assert.equal((await cli('connector', 'status', 'backend')).connectorControl.exposures.length, 0);
  await cli('connector', 'expose', 'backend', 'save', '--file', file);
  await cli('connector', 'revoke', 'backend', 'save');
  assert.equal((await cli('connector', 'status', 'backend')).connectorControl.exposures.length, 0);
  await cli('connector', 'expose', 'backend', 'save', '--file', file);
  await writeFile(join(f.sourceDirectory, 'description.md'), '# Reviewed replacement\n');
  let next = (await f.registry.prepare('example.records.save')).result;
  await f.registry.bind('example.records.save', next.scriptId, next.revision);
  await cli('connector', 'update', 'backend', 'save');
  assert.equal((await cli('connector', 'status', 'backend')).connectorControl.exposures.length, 0);
  await assert.rejects(cli('connector', 'expose', 'backend', 'save', '--file', file));
  for (let override of [
    {
      resources: {},
    },
    {
      origin: 'http://public.example',
    },
    {
      expiresInSeconds: 86401,
    },
    {
      requestsPerMinute: 0,
    },
    {
      resources: {
        nested: {},
      },
    },
  ]) { assert.throws(() => validateExposureOptions({
    ...policy,
    ...override,
  })); }
});

test('changing actor capability during a call suppresses its late result and preserves the receipt', {
  timeout: 30000,
}, async (t) => {
  let f = await publicConnectorFixture(t);
  let first = await f.expose();
  let second = await f.expose({
    actor: 'second-actor',
  });
  let socket = await f.connect();
  assert.equal(await f.authorize(socket, first.token), true);
  let id = randomUUID();
  let pending = f.call(socket, {
    value: 'allowed',
    delay: 1500,
  }, id);
  // Wait for runner admission, not a guessed execution delay.
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await core.listReceipts(f.coreRoot)).some((entry) => entry.requestId === id)) { break; }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(await f.authorize(socket, second.token), true);
  let result = await pending;
  assert.equal(result.state, 'unknown');
  assert.equal(result.value, undefined);
  assert.equal((await f.call(socket, undefined, id, true)).value, undefined);
  assert.equal(await f.authorize(socket, first.token), true);
  assert.equal((await f.call(socket, undefined, id, true)).state, 'completed');
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 1);
});
