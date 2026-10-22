import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { on, once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { PageConnection } from '../../src/server/page-connection.js';
import { SessionFeedback } from '../../src/feedback/session-feedback.js';
import { SessionEvents } from '../../src/sessions/events.js';
import { createPageAccess } from '../../src/server/page-access.js';
import { closeServer, waitForServer } from '../../src/shared/server.js';

/**
 * @param {WebSocket} socket
 * @param {(message: any) => boolean} matches
 */
async function message(socket, matches) {
  for await (let [data] of on(socket, 'message', { signal: AbortSignal.timeout(5_000) })) {
    let parsed = JSON.parse(data.toString());
    if (matches(parsed)) { return parsed; }
  }
}

/**
 * @param {import('node:test').TestContext} t
 * @param {boolean} [sharing]
 */
async function setup(t, sharing = false) {
  let identity = { sessionId: 'page-feedback', instanceId: randomUUID(), controlToken: '', pid: process.pid, launcherPid: process.pid };
  let feedback = new SessionFeedback(identity);
  await feedback.configure({ ...feedback.identity, conversationId: randomUUID(), command: {
    executable: process.execPath, args: [fileURLToPath(new URL('./feedback-fixture.js', import.meta.url)), 'accept'], input: { channel: 'stdin' },
  } });
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let access = createPageAccess(identity);
  access.sharing = sharing;
  let events = new SessionEvents();
  let pages = new PageConnection(server, origin, access, async () => {}, (event) => events.add(event), feedback);
  if (sharing) { pages.shared.enable(0); }
  t.after(async () => { await feedback.close(); await pages.close(); await closeServer(server); });
  return {
    feedback, pages, events, identity,
    async connect(viewer = false) {
      let socket = new WebSocket(`${origin.replace('http:', 'ws:')}${access.socketPath}${viewer ? '?mode=viewer' : ''}`, { origin });
      let status = viewer ? undefined : message(socket, (entry) => entry.type === 'feedback-status');
      await once(socket, 'open');
      if (status) { await status; }
      return socket;
    },
    submission() {
      return { submissionId: randomUUID(), instanceId: identity.instanceId, revision: 'revision-1',
        event: { type: 'changes.submitted', source: 'editor', data: { name: 'Alex' } } };
    },
  };
}

test('feedback uses its own explicit message and recovers retained receipts without draining events', async (t) => {
  let session = await setup(t);
  let socket = await session.connect();
  let input = session.submission();
  socket.send(JSON.stringify({ type: 'event', name: 'agui:action', data: { action: 'change' } }));
  let accepted = message(socket, (entry) => entry.type === 'feedback-result' && entry.delivery.state === 'accepted');
  socket.send(JSON.stringify({ type: 'feedback-submit', submission: input }));
  let result = await accepted;
  assert.equal(result.delivery.submissionId, input.submissionId);
  assert.equal(result.delivery.revision, input.revision);
  assert.equal(session.events.drain().events[0].name, 'agui:action');
  assert.equal(session.events.drain().events.length, 0);
  let completed = 0;
  session.feedback.on('delivery', () => { completed += 1; });
  socket.close();
  await once(socket, 'close');
  let reconnected = await session.connect();
  let recovered = message(reconnected, (entry) => entry.type === 'feedback-result');
  let { event, ...reference } = input;
  reconnected.send(JSON.stringify({ type: 'feedback-read', references: [reference] }));
  assert.deepEqual((await recovered).delivery, result.delivery);
  let duplicate = message(reconnected, (entry) => entry.type === 'feedback-result');
  reconnected.send(JSON.stringify({ type: 'feedback-submit', submission: input }));
  assert.equal((await duplicate).delivery.state, 'accepted');
  assert.equal(completed, 0);
  let stale = message(reconnected, (entry) => entry.type === 'feedback-result');
  reconnected.send(JSON.stringify({ type: 'feedback-submit', submission: { ...input, submissionId: randomUUID(), instanceId: randomUUID() } }));
  assert.equal((await stale).delivery.failure.code, 'STALE_INSTANCE');
});

test('pending agent commands cannot cause feedback submission', async (t) => {
  let session = await setup(t);
  let socket = await session.connect();
  let [peer] = session.pages.clients;
  assert.ok(peer);
  /** @type {import('../../types/transport.js').PageCommand[]} */
  let commands = [
    { type: 'update', selector: '#editor', values: { name: 'Agent edit' } },
    { type: 'render', html: '', revision: 1, stylesheetUrl: '/styles.css.js' },
    { type: 'tools' },
    { type: 'call', discoveryId: 'catalog', name: 'save', input: {}, deadline: Date.now() + 5_000 },
  ];
  for (let input of commands) {
    let incoming = message(socket, (entry) => entry.type === input.type);
    let updating = session.pages.request(peer, input);
    let command = await incoming;
    let rejected = message(socket, (entry) => entry.type === 'feedback-result');
    socket.send(JSON.stringify({ type: 'feedback-submit', submission: session.submission() }));
    assert.equal((await rejected).delivery.failure.code, 'AGENT_UPDATE');
    assert.equal(session.feedback.status().pending, 0);
    socket.send(JSON.stringify({ type: 'result', id: command.id }));
    await updating;
  }
});

test('viewers cannot submit or query feedback and receive no command configuration', async (t) => {
  let session = await setup(t, true);
  await session.connect();
  for (let type of ['feedback-submit', 'feedback-read']) {
    let viewer = await session.connect(true);
    let closed = once(viewer, 'close');
    viewer.send(JSON.stringify(type === 'feedback-submit' ? { type, submission: session.submission() } : { type, references: [] }));
    assert.equal((await closed)[0], 1008);
  }
  assert.equal(session.feedback.status().pending, 0);
});
