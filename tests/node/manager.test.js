import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { once } from 'node:events';
import { get } from 'node:http';
import { WebSocket } from 'ws';
import { temporaryState } from './state-fixture.js';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';
import { startManager, statusManager, stopManager } from '../../src/manager/lifecycle.js';
import { readManager, reserveManager, releaseManager } from '../../src/manager/registry.js';
import { startManagerServer } from '../../src/manager/server.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { readSession, writeSession } from '../../src/sessions/store.js';
import { stopSession, statusSession } from '../../src/sessions/lifecycle.js';
import { runAllSessions } from '../../src/sessions/all.js';
import { parseCommand } from '../../src/cli/parse.js';

/** @param {string} sessionId */
async function save(sessionId) {
  let pending = await prepareCachedMarkup(sessionId, '<h1>Manager test</h1>');
  await pending.commit();
  await pending.discard();
}

test('manager commands and inputs restrict capabilities to named sessions', () => {
  assert.deepEqual(parseCommand(['manager', '--no-open']), { kind: 'manager', command: 'start', open: false });
  assert.equal(parseCommand(['manager', 'status']).kind, 'manager');
  for (let args of [['manager', 'share'], ['manager', 'stop', '--no-open'], ['manager', '--file', '/tmp/a']]) {
    assert.throws(() => parseCommand(args));
  }
  for (let request of [
    { operation: 'snapshot', stateRoot: '/tmp' },
    { operation: 'start', sessionId: '../escape' },
    { operation: 'constructor', sessionId: 'desk' },
    { operation: 'share', all: true },
    { operation: 'clear', sessionId: 'desk' },
    { operation: 'sync', all: true },
    { operation: 'snapshot', sessionId: 'desk' },
  ]) { assert.throws(() => validateManagerRequest({ id: 'request', ...request })); }
});

test('manager lists saved sessions, deduplicates requests and serializes direct lifecycle operations', { timeout: 40_000 }, async (t) => {
  let state = await temporaryState();
  t.after(async () => { await stopSession('desk'); await state.close(); });
  await save('desk');
  let operations = new ManagerOperations();
  let snapshot = await operations.snapshot();
  assert.partialDeepStrictEqual(snapshot.sessions, [{ sessionId: 'desk', active: false, definition: { title: 'desk' } }]);
  assert.equal(JSON.stringify(snapshot).includes('controlToken'), false);
  let request = { id: randomUUID(), operation: 'start', sessionId: 'desk' };
  let [first, duplicate] = await Promise.all([operations.dispatch(request), operations.dispatch(request)]);
  assert.equal(first.ok, true);
  assert.deepEqual(duplicate, first);
  let pid = (await readSession('desk'))?.pid;
  assert.equal((await operations.dispatch({ ...request, id: randomUUID() })).ok, true);
  assert.equal((await readSession('desk'))?.pid, pid, 'Starting a running session reuses its worker.');
  assert.equal((await operations.dispatch({ ...request, operation: 'stop' })).ok, false, 'An ID cannot change operations.');
  let [stop, start] = await Promise.all([
    operations.dispatch({ id: randomUUID(), operation: 'stop', sessionId: 'desk' }),
    operations.dispatch({ id: randomUUID(), operation: 'start', sessionId: 'desk' }),
  ]);
  assert.equal(stop.ok, true);
  assert.equal(start.ok, true);
  assert.equal((await statusSession('desk')).active, true);
  let description = await operations.dispatch({ id: randomUUID(), operation: 'describe', sessionId: 'desk' });
  assert.match(description.description?.description || '', /Interactive workspace/);
  assert.equal((await operations.dispatch({ id: randomUUID(), operation: 'start', sessionId: 'outside' })).ok, false);
  assert.equal(await readSession('outside'), undefined);
});

test('manager bulk results retain failures and reject mismatched worker identity', { timeout: 30_000 }, async (t) => {
  let state = await temporaryState();
  t.after(async () => { await stopSession('valid'); await stopSession('broken'); await state.close(); });
  await save('valid');
  await save('broken');
  let operations = new ManagerOperations();
  await operations.dispatch({ id: 'start', operation: 'start', sessionId: 'broken' });
  let record = await readSession('broken');
  assert.ok(record);
  let pid = record.pid;
  t.after(async () => { record.pid = pid; await writeSession(record).catch(() => {}); });
  record.pid = process.pid;
  await writeSession(record);
  let result = await operations.dispatch({ id: 'bulk', operation: 'start', all: true });
  assert.equal(result.ok, false);
  assert.equal(result.sessions?.find((row) => row.sessionId === 'valid')?.ok, true);
  assert.equal(result.sessions?.find((row) => row.sessionId === 'broken')?.ok, false);
  assert.equal((await operations.snapshot()).sessions.find((row) => row.sessionId === 'broken')?.active, null);
  record.pid = pid;
  await writeSession(record);
});

test('manager storage is pinned and independent across team folders', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let folderA = join(state.directory, 'a');
  let folderB = join(state.directory, 'b');
  await Promise.all([mkdir(folderA), mkdir(folderB)]);
  process.env.AGUI_LIBRARY_DIR = folderA;
  await save('only-a');
  let operations = new ManagerOperations();
  let record = await reserveManager();
  process.env.AGUI_LIBRARY_DIR = folderB;
  assert.equal(await readManager(), undefined);
  assert.equal((await operations.dispatch({ id: 'scope', operation: 'snapshot' })).ok, false);
  let other = new ManagerOperations();
  assert.deepEqual((await other.snapshot()).sessions, []);
  process.env.AGUI_LIBRARY_DIR = folderA;
  await releaseManager(record);
});

test('manager WebSocket requires its origin and credential; assets cannot serve arbitrary files', async (t) => {
  let state = await temporaryState();
  let record = await reserveManager();
  let endpoint = await startManagerServer(record, () => {});
  t.after(async () => { await endpoint.close(); await releaseManager(record); await state.close(); });
  let url = new URL(endpoint.url);
  let socketUrl = `ws://${url.host}/manager/socket`;
  let hostStatus = await new Promise((resolve, reject) => {
    get(endpoint.url, { headers: { host: 'attacker.test' } }, (reply) => { reply.resume(); resolve(reply.statusCode); }).on('error', reject);
  });
  assert.equal(hostStatus, 403);
  assert.equal((await fetch(endpoint.url, { headers: { origin: 'https://attacker.test' } })).status, 403);
  assert.equal((await fetch(`${endpoint.url}status`)).status, 403);
  assert.equal((await fetch(`${endpoint.url}vendor/../../package.json`)).status, 404);
  let response = await fetch(endpoint.url);
  assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  let bundle = await (await fetch(`${endpoint.url}page/index.js`)).text();
  assert.match(bundle, /agui-dashboard/);
  assert.match(bundle, /agui-toggle/);
  assert.doesNotMatch(bundle, /from ['"]@symbiotejs/);
  let badOrigin = new WebSocket(socketUrl, { origin: 'http://127.0.0.1:1111' });
  badOrigin.on('error', () => {});
  await new Promise((resolve) => badOrigin.on('unexpected-response', (_request, reply) => {
    assert.equal(reply.statusCode, 403);
    reply.resume(); badOrigin.terminate(); resolve(undefined);
  }));
  let unauthorized = new WebSocket(socketUrl, { origin: url.origin });
  await once(unauthorized, 'open');
  unauthorized.send(JSON.stringify({ type: 'authenticate', token: 'x'.repeat(64) }));
  assert.equal((await once(unauthorized, 'close'))[0], 1008);
  let client = new WebSocket(socketUrl, { origin: url.origin });
  await once(client, 'open');
  client.send(JSON.stringify({ type: 'authenticate', token: record.token }));
  assert.equal(JSON.parse(String((await once(client, 'message'))[0])).type, 'authorized');
  client.send(JSON.stringify({ id: 'snapshot', operation: 'snapshot' }));
  let reply = JSON.parse(String((await once(client, 'message'))[0]));
  assert.equal(reply.result.ok, true);
  assert.deepEqual(reply.result.snapshot.sessions, []);
  client.close();
  await once(client, 'close');
});

test('detached manager reuses its URL and survives session stop-all and clear-all', { timeout: 40_000 }, async (t) => {
  let state = await temporaryState();
  t.after(async () => { await stopManager(); await state.close(); });
  await save('saved');
  let [manager, concurrent] = await Promise.all([startManager(false), startManager(false)]);
  assert.equal(concurrent.pid, manager.pid, 'Concurrent launches publish one manager.');
  assert.equal(manager.active, true);
  assert.match(manager.launchUrl || '', /\/manager\/#/);
  let reused = await startManager(false);
  assert.equal(reused.pid, manager.pid);
  assert.equal(reused.url, manager.url);
  await runAllSessions('stop-all');
  await runAllSessions('clear-all');
  assert.equal((await statusManager()).active, true);
  assert.equal((await stopManager()).active, false);
  assert.equal((await statusManager()).active, false);
});

test('manager shutdown waits for accepted requests before session locks are acquired', { timeout: 20_000 }, async (t) => {
  let state = await temporaryState();
  await save('desk');
  let record = await reserveManager();
  let endpoint = await startManagerServer(record, () => {});
  t.after(async () => {
    await endpoint.close();
    await stopSession('desk');
    await releaseManager(record);
    await state.close();
  });
  let release = () => {};
  let accepted = () => {};
  let gate = new Promise((resolve) => { release = () => resolve(undefined); });
  let entered = new Promise((resolve) => { accepted = () => resolve(undefined); });
  let dispatch = endpoint.operations.dispatch.bind(endpoint.operations);
  endpoint.operations.dispatch = async (input) => { accepted(); await gate; return dispatch(input); };
  let url = new URL(endpoint.url);
  let socket = new WebSocket(`ws://${url.host}/manager/socket`, { origin: url.origin });
  await once(socket, 'open');
  socket.send(JSON.stringify({ type: 'authenticate', token: record.token }));
  await once(socket, 'message');
  socket.send(JSON.stringify({ id: 'accepted-start', operation: 'start', sessionId: 'desk' }));
  await entered;
  let closed = false;
  let closing = endpoint.close().then(() => { closed = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(closed, false);
  release();
  await closing;
  assert.equal((await statusSession('desk')).active, true, 'Accepted work finishes and manager shutdown leaves its worker alive.');
});
