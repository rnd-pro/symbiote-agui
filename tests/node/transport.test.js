import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { WebSocket } from 'ws';
import { PageConnection } from '../../src/server/page-connection.js';
import { closeServer, waitForServer } from '../../src/shared/server.js';
import { SessionEvents } from '../../src/sessions/events.js';
import { analyzeMarkup } from '../../src/markup/analyze.js';
import { validateStateUpdate } from '../../src/transport/state-update.js';
import { MAX_EVENTS } from '../../src/transport/constants.js';

test('WebSocket access requires both the page token and matching origin', async (t) => {
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let token = randomBytes(32).toString('hex');
  let pages = new PageConnection(server, origin, token, async () => {}, () => {});
  t.after(async () => { await pages.close(); await closeServer(server); });
  for (let [supplied, requestOrigin] of [[token, 'http://example.com'], ['wrong', origin]]) {
    let socket = new WebSocket(`${origin.replace('http:', 'ws:')}/socket?token=${supplied}`, { origin: requestOrigin });
    await assert.rejects(once(socket, 'open'), /403/);
  }
  assert.equal(pages.clients.size, 0);
  let socket = new WebSocket(`${origin.replace('http:', 'ws:')}/socket?token=${token}`, { origin });
  await once(socket, 'open');
  assert.equal(pages.clients.size, 1);
});

test('page acknowledgements are correlated and disconnection rejects pending delivery', async (t) => {
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let token = randomBytes(32).toString('hex');
  let pages = new PageConnection(server, origin, token, async () => {}, () => {});
  t.after(async () => { await pages.close(); await closeServer(server); });
  let socket = new WebSocket(`${origin.replace('http:', 'ws:')}/socket?token=${token}`, { origin });
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
