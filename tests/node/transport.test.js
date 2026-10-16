import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { WebSocket } from 'ws';
import { PageConnection } from '../../src/server/page-connection.js';
import { closeServer, waitForServer } from '../../src/shared/server.js';
import { SessionEvents } from '../../src/sessions/events.js';
import { analyzeMarkup } from '../../src/markup/analyze.js';
import { validateStateUpdate } from '../../src/transport/state-update.js';
import { MAX_EVENTS, PAGE_REQUEST_TIMEOUT_MS } from '../../src/transport/constants.js';
import { createPageAccess } from '../../src/server/page-access.js';

function pageAccess() {
  return createPageAccess({
    sessionId: 'socket-test',
    instanceId: randomUUID(),
    pageToken: randomBytes(32).toString('hex'),
    controlToken: '',
    pid: process.pid,
    launcherPid: process.pid,
  });
}

test('WebSocket access requires a scoped cookie, session path, and matching origin', async (t) => {
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let access = pageAccess();
  let cookie = `${access.cookieName}=${access.token}`;
  let pages = new PageConnection(server, origin, access, async () => {}, () => {});
  t.after(async () => { await pages.close(); await closeServer(server); });
  for (let [path, supplied, requestOrigin] of [
    [access.socketPath, cookie, 'http://example.com'],
    [access.socketPath, '', origin],
    [access.socketPath, `${access.cookieName}=wrong`, origin],
    [access.socketPath, `agui-other=${access.token}`, origin],
    ['/other/socket', cookie, origin],
    [`${access.socketPath}?token=${access.token}`, cookie, origin],
  ]) {
    let socket = new WebSocket(`${origin.replace('http:', 'ws:')}${path}`, { origin: requestOrigin, headers: { Cookie: supplied } });
    await assert.rejects(once(socket, 'open'), /403/);
  }
  assert.equal(pages.clients.size, 0);
  let socket = new WebSocket(`${origin.replace('http:', 'ws:')}${access.socketPath}`, { origin, headers: { Cookie: cookie } });
  await once(socket, 'open');
  assert.equal(pages.clients.size, 1);
});

test('page acknowledgements are correlated and disconnection rejects pending delivery', async (t) => {
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let access = pageAccess();
  let pages = new PageConnection(server, origin, access, async () => {}, () => {});
  t.after(async () => { await pages.close(); await closeServer(server); });
  let socket = new WebSocket(`${origin.replace('http:', 'ws:')}${access.socketPath}`, {
    origin,
    headers: { Cookie: `${access.cookieName}=${access.token}` },
  });
  await once(socket, 'open');
  let [peer] = pages.clients;
  assert.ok(peer);
  let incoming = once(socket, 'message');
  let delivered = pages.request(peer, { type: 'update', selector: '#counter', values: { count: 1 } });
  let [data] = await incoming;
  let command = JSON.parse(data.toString());
  assert.equal(command.type, 'update');
  socket.send(JSON.stringify({ type: 'result', id: 'unrelated' }));
  socket.send(JSON.stringify({ type: 'result', id: command.id }));
  await delivered;
  assert.equal(pages.pending.size, 0);
  let interrupted = pages.request(peer, { type: 'update', selector: '#counter', values: { count: 2 } });
  let rejected = assert.rejects(interrupted, /disconnected/);
  socket.close();
  await rejected;
  assert.equal(pages.pending.size, 0);
});

test('server parsing validates fragments and collects classes from nested templates', () => {
  let markup = '<template id="outer"><template id="inner"><p class="p-8 w-[123px]">Text</p></template></template><user-card use-template="#outer"><script type="application/json">{"name":"Alex"}</script></user-card>';
  let result = analyzeMarkup(markup);
  assert.deepEqual(result.classes, ['p-8', 'w-[123px]']);
  assert.ok(result.tags.has('user-card'));
  for (let invalid of [
    '<user-card use-template="#missing"></user-card>',
    '<agui-component><script type="text/json">{broken}</script></agui-component>',
    '<context-provider ctx="same"></context-provider><context-provider ctx="same"></context-provider>',
    '<script type="module" data-agui src="/missing.js"></script>',
  ]) {
    assert.throws(() => analyzeMarkup(invalid));
  }
  assert.throws(() => validateStateUpdate({ selector: '#counter', values: {}, method: 'remove' }));
  assert.throws(() => validateStateUpdate(JSON.parse('{"selector":"#counter","values":{"__proto__":{}}}')));
});

test('tool results are scoped to their socket and timed out requests cannot be completed by late replies', async (t) => {
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let access = pageAccess();
  let pages = new PageConnection(server, origin, access, async () => {}, () => {});
  t.after(async () => { await pages.close(); await closeServer(server); });
  let options = { origin, headers: { Cookie: `${access.cookieName}=${access.token}` } };
  let first = new WebSocket(`${origin.replace('http:', 'ws:')}${access.socketPath}`, options);
  await once(first, 'open');
  let second = new WebSocket(`${origin.replace('http:', 'ws:')}${access.socketPath}`, options);
  await once(second, 'open');
  let [peer] = pages.clients;
  assert.ok(peer);
  let incoming = once(first, 'message');
  let pending = pages.request(peer, { type: 'tools' });
  let [data] = await incoming;
  let command = JSON.parse(data.toString());
  second.send(JSON.stringify({ type: 'result', id: command.id, result: 'wrong page' }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pages.pending.size, 1);
  first.send(JSON.stringify({ type: 'result', id: command.id, result: { discoveryId: 'correct', tools: [] } }));
  assert.deepEqual(await pending, { discoveryId: 'correct', tools: [] });

  t.mock.timers.enable({ apis: ['setTimeout'] });
  let timed = pages.request(peer, { type: 'tools' });
  let [id] = pages.pending.keys();
  let rejected = assert.rejects(timed, /outcome may be unknown; do not retry automatically/);
  t.mock.timers.tick(PAGE_REQUEST_TIMEOUT_MS);
  await rejected;
  t.mock.timers.reset();
  first.send(JSON.stringify({ type: 'result', id, result: 'late' }));
  assert.equal(pages.pending.size, 0);
});

test('event buffering reports overflow and drains without duplicates', () => {
  let events = new SessionEvents();
  for (let value = 0; value < MAX_EVENTS + 2; value += 1) {
    events.add({ type: 'event', name: 'count', data: value });
  }
  let batch = events.drain();
  assert.equal(batch.events.length, MAX_EVENTS);
  assert.equal(batch.events[0]?.data, 2);
  assert.equal(batch.dropped, 2);
  assert.deepEqual(events.drain(), { events: [], dropped: 0 });
});
