import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { on, once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { WebSocket } from 'ws';
import { PageConnection } from '../../src/server/page-connection.js';
import { createPageAccess } from '../../src/server/page-access.js';
import { closeServer, waitForServer } from '../../src/shared/server.js';
import { annotationPoint } from './annotations-fixture.js';

/**
 * @param {WebSocket} socket
 * @param {import('../../types/transport.js').AnnotationServerMessage['action']} action
 */
async function nextAnnotation(socket, action) {
  for await (let [data] of on(socket, 'message', {
    signal: AbortSignal.timeout(3_000),
  })) {
    let packet = /** @type {import('../../types/transport.js').AnnotationServerMessage} */ (JSON.parse(data.toString()));
    if (packet.type === 'annotations' && packet.action === action) { return packet; }
  }
  throw new Error('Annotation connection ended.');
}

/**
 * @param {import('node:test').TestContext} t
 * @param {boolean} [sharing]
 */
async function setup(t, sharing = true) {
  let server = createServer();
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  let access = createPageAccess({
    sessionId: 'annotations',
    instanceId: randomUUID(),
    controlToken: randomUUID(),
    pid: process.pid,
    launcherPid: process.pid,
  });
  access.sharing = sharing;
  /** @type {import('../../types/transport.js').SessionEvent[]} */
  let events = [];
  let pages = new PageConnection(server, origin, access, async () => {}, (message) => {
    events.push({
      ...message,
      id: randomUUID(),
      time: new Date().toISOString(),
    });
  });
  if (sharing) { pages.shared.enable(0); }
  t.after(async () => { await pages.close(); await closeServer(server); });
  return {
    pages,
    events,
    async connect(mode = '') {
      let socket = new WebSocket(`${origin.replace('http:', 'ws:')}${access.socketPath}${mode ? `?mode=${mode}` : ''}`, {
        origin,
      });
      let incoming = sharing ? nextAnnotation(socket, 'state') : undefined;
      await once(socket, 'open');
      let state = await incoming;
      if (state && state.action !== 'state') { throw new Error('Expected annotation bootstrap.'); }
      return {
        socket,
        state,
      };
    },
  };
}

test('real shared sockets broadcast annotation presence and strokes, replay transient state, and clean up reconnects', {
  timeout: 10_000,
}, async (t) => {
  let {
    pages,
    events,
    connect,
  } = await setup(t);
  let user = await connect('user');
  let first = await connect('viewer');
  let joined = nextAnnotation(user.socket, 'join');
  let second = await connect('viewer');
  assert.equal((await joined).action, 'join');
  assert.ok(first.state?.self && second.state?.self);
  assert.notEqual(first.state.self.id, second.state.self.id);
  assert.notEqual(first.state.self.color, second.state.self.color);
  assert.equal(second.state.participants.length, 2);
  for (let privateId of pages.pages.keys()) {
    assert.equal(JSON.stringify(second.state).includes(privateId), false);
  }
  let cursors = [
    nextAnnotation(user.socket, 'cursor'),
    nextAnnotation(first.socket, 'cursor'),
    nextAnnotation(second.socket, 'cursor'),
  ];
  first.socket.send(JSON.stringify({
    type: 'annotation',
    action: 'cursor',
    revision: 0,
    sequence: 1,
    point: annotationPoint(),
  }));
  for (let packet of await Promise.all(cursors)) {
    assert.equal(packet.action, 'cursor');
    if (packet.action === 'cursor') {
      assert.equal(packet.viewerId, first.state.self.id);
      assert.deepEqual(packet.point, annotationPoint());
    }
  }
  let stroke = nextAnnotation(user.socket, 'stroke');
  first.socket.send(JSON.stringify({
    type: 'annotation',
    action: 'stroke',
    phase: 'start',
    revision: 0,
    sequence: 2,
    points: [
      annotationPoint(),
    ],
  }));
  assert.equal((await stroke).action, 'stroke');
  let late = await connect('viewer');
  assert.equal(late.state?.strokes.length, 1);
  assert.equal(late.state?.strokes[0].viewerId, first.state.self.id);
  let left = nextAnnotation(second.socket, 'leave');
  let closed = once(first.socket, 'close');
  first.socket.close();
  await closed;
  assert.equal((await left).action, 'leave');
  let reconnect = await connect('viewer');
  assert.notEqual(reconnect.state?.self?.id, first.state.self.id);
  assert.equal(reconnect.state?.participants.some((entry) => entry.id === first.state?.self?.id), false);
  assert.equal(reconnect.state?.strokes.length, 1);
  assert.deepEqual(events, [], 'Annotations never enter application events or feedback.');
});

test('viewer annotation admission never allows snapshots, feedback, commits, events or command replies', {
  timeout: 10_000,
}, async (t) => {
  let {
    pages,
    events,
    connect,
  } = await setup(t);
  await connect('user');
  for (let input of [
    {
      type: 'event',
      name: 'agui:action',
      data: 'forged',
    },
    {
      type: 'snapshot',
      html: '<p>forged</p>',
      revision: 0,
      stylesheetUrl: '/styles.css.js',
    },
    {
      type: 'data-commit',
    },
    {
      type: 'data-read',
    },
    {
      type: 'feedback-submit',
    },
    {
      type: 'feedback-read',
    },
    {
      type: 'session-info-read',
      id: randomUUID(),
    },
    {
      type: 'result',
      id: randomUUID(),
      result: 'forged',
    },
    {
      type: 'annotation',
      revision: 0,
      sequence: 1,
      action: 'cursor',
      point: annotationPoint(),
      viewerId: 'forged',
    },
  ]) {
    let viewer = await connect('viewer');
    let closed = once(viewer.socket, 'close');
    viewer.socket.send(JSON.stringify(input));
    assert.equal((await closed)[0], 1008);
  }
  // A fresh viewer still cannot receive an agent command.
  let viewer = await connect('viewer');
  let peer = Array.from(pages.shared.annotations.members.keys()).find((page) =>
    pages.shared.annotations.members.get(page)?.presence.id === viewer.state?.self?.id);
  assert.ok(peer);
  await assert.rejects(pages.request(peer.socket, {
    type: 'tools',
  }), /Viewers cannot/);
  assert.deepEqual(events, []);
  assert.equal(pages.shared.latest, undefined);
  assert.equal(pages.shared.annotations.strokes.size, 0);
});

test('annotations are rejected on ordinary local pages and from the interactive user', {
  timeout: 10_000,
}, async (t) => {
  for (let sharing of [
    false,
    true,
  ]) {
    let session = await setup(t, sharing);
    let user = await session.connect();
    let closed = once(user.socket, 'close');
    user.socket.send(JSON.stringify({
      type: 'annotation',
      revision: 0,
      sequence: 1,
      action: 'cursor',
      point: annotationPoint(),
    }));
    assert.equal((await closed)[0], 1008);
    assert.equal(session.pages.shared.annotations.members.size, 0);
  }
});
