import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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
    controlToken: '',
    pid: process.pid,
    launcherPid: process.pid,
  });
}

test('WebSocket admission needs only the session path and allowed origin', async (t) => {
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let access = pageAccess();
  let pages = new PageConnection(server, origin, access, async () => {}, () => {});
  t.after(async () => { await pages.close(); await closeServer(server); });
  for (let [path, requestOrigin] of [
    [access.socketPath, 'http://example.com'],
    [access.socketPath, undefined],
    [access.socketPath, 'null'],
    ['/other/socket', origin],
    [access.socketPath + '?mode=viewer', origin],
    [access.socketPath + '?token=invalid', origin],
  ]) {
    let socket = new WebSocket(origin.replace('http:', 'ws:') + path, { origin: requestOrigin });
    await assert.rejects(once(socket, 'open'), /403/);
  }
  assert.equal(pages.clients.size, 0);
  let socket = new WebSocket(origin.replace('http:', 'ws:') + access.socketPath, { origin });
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
  let options = { origin };
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

test('shared pages elect one user without credentials, release the slot, and reject viewer actions', async (t) => {
  let access = pageAccess();
  access.sharing = true;
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let events = new SessionEvents();
  let pages = new PageConnection(server, origin, access, async () => {}, (message) => events.add(message));
  pages.shared.enable(0);
  t.after(async () => { await pages.close(); await closeServer(server); });
  let connect = async (mode = '') => {
    let socket = new WebSocket(origin.replace('http:', 'ws:') + access.socketPath + (mode ? '?mode=' + mode : ''), { origin });
    socket.on('message', (data) => {
      let message = JSON.parse(data.toString());
      if (message.type === 'render') { socket.send(JSON.stringify({ type: 'result', id: message.id })); }
    });
    await once(socket, 'open');
    return socket;
  };
  let viewer = await connect('viewer');
  assert.equal(pages.shared.user(), undefined);
  let user = await connect('user');
  let second = await connect();
  let duplicate = await connect();
  assert.deepEqual([...pages.pages.values()].map((page) => page.role), ['viewer', 'user', 'viewer', 'viewer']);
  let nextSnapshot = new Promise((resolve) => viewer.on('message', (data) => {
    let message = JSON.parse(data.toString());
    if (message.type === 'snapshot') { resolve(message); }
  }));
  user.send(JSON.stringify({ type: 'snapshot', html: '<p>Count: 7</p>', revision: 0, stylesheetUrl: '/styles.css.js', rootStyles: '@layer components { p { color: red; } }' }));
  let snapshot = await nextSnapshot;
  assert.equal(snapshot.html, '<p>Count: 7</p>');
  assert.equal(snapshot.rootStyles, '@layer components { p { color: red; } }');
  user.send(JSON.stringify({ type: 'event', name: 'count', data: 7 }));
  let viewerClosed = once(viewer, 'close');
  viewer.send(JSON.stringify({ type: 'event', name: 'count', data: 999 }));
  assert.equal((await viewerClosed)[0], 1008);
  assert.deepEqual(events.drain().events.map((event) => event.data), [7]);
  let forgedClosed = once(second, 'close');
  second.send(JSON.stringify({ type: 'snapshot', html: '<p>Forged</p>', revision: 0, stylesheetUrl: '/styles.css.js' }));
  assert.equal((await forgedClosed)[0], 1008);
  assert.equal(pages.shared.latest?.html, '<p>Count: 7</p>');
  let viewerPeer = [...pages.pages.values()].find((page) => page.role === 'viewer');
  assert.ok(viewerPeer);
  await assert.rejects(pages.request(viewerPeer.socket, { type: 'tools' }), /Viewers cannot/);
  let ownerPage = pages.shared.user();
  assert.ok(ownerPage);
  let userDisconnected = once(ownerPage.socket, 'close');
  user.close();
  await userDisconnected;
  assert.equal(pages.shared.user(), undefined);
  assert.equal([...pages.pages.values()].every((page) => page.role === 'viewer'), true);
  let reconnect = await connect();
  assert.equal([...pages.pages.values()].filter((page) => page.role === 'user').length, 1);
  let reset = new Promise((resolve) => duplicate.on('message', (data) => {
    let message = JSON.parse(data.toString());
    if (message.type === 'snapshot' && message.revision === 1) { resolve(message); }
  }));
  await pages.broadcast({ type: 'render', html: '', revision: 1, stylesheetUrl: '/styles.css.js?revision=1' });
  assert.equal((await reset).html, '');
  reconnect.close();
});
