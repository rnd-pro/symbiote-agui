import assert from 'node:assert/strict';
import test from 'node:test';
import { ANNOTATION_LIMITS, MAX_PAGE_MESSAGE_BYTES } from '../../src/transport/constants.js';
import { validateAnnotation } from '../../src/transport/annotations.js';
import { annotationsFixture, annotationPoint } from './annotations-fixture.js';

test('annotation packets reject spoofed metadata, unbounded input, invalid coordinates and malformed phases', () => {
  let packet = {
    type: 'annotation',
    action: 'cursor',
    revision: 0,
    sequence: 1,
    point: annotationPoint(),
  };
  assert.deepEqual(validateAnnotation(packet, 128), packet);
  for (let extra of [
    {
      color: 'red',
    },
    {
      viewerId: 'another-viewer',
    },
    {
      time: Date.now(),
    },
    {
      sequence: 0,
    },
    {
      revision: -1,
    },
    {
      point: {
        ...annotationPoint(),
        x: Infinity,
      },
    },
    {
      point: {
        ...annotationPoint(),
        y: -0.01,
      },
    },
    {
      point: {
        ...annotationPoint(),
        anchor: '<script>',
      },
    },
  ]) { assert.throws(() => validateAnnotation({
    ...packet,
    ...extra,
  }, 128)); }
  assert.throws(() => validateAnnotation(packet, ANNOTATION_LIMITS.messageBytes + 1));
  let stroke = {
    type: 'annotation',
    action: 'stroke',
    revision: 0,
    sequence: 1,
    phase: 'start',
    points: [
      annotationPoint(),
    ],
  };
  for (let extra of [
    {
      phase: [
        'start',
      ],
    },
    {
      points: [],
    },
    {
      points: Array(ANNOTATION_LIMITS.pointsPerMessage + 1).fill(annotationPoint()),
    },
    {
      points: [
        null,
      ],
    },
  ]) { assert.throws(() => validateAnnotation({
    ...stroke,
    ...extra,
  }, 128)); }
});

test('viewer identities and colors are server-owned, scoped and bounded without denying ordinary viewing', (t) => {
  let fixture = annotationsFixture();
  let other = annotationsFixture();
  t.after(() => { fixture.annotations.close(); other.annotations.close(); });
  let user = fixture.add('user');
  let first = fixture.add();
  let second = fixture.add();
  let firstId = first.state().self;
  assert.ok(firstId);
  assert.notEqual(firstId.id, second.state().self?.id);
  assert.notEqual(firstId.color, second.state().self?.color);
  assert.equal(user.state().self, null);
  assert.equal(user.state().participants.length, 2);
  assert.equal(user.messages.some((message) => message.action === 'join'), true);
  assert.throws(() => user.send({
    action: 'cursor',
    point: annotationPoint(),
  }), /Only connected viewers/);
  assert.throws(() => other.annotations.receive(first.page, {}, 2), /Only connected viewers/);
  for (let index = 2; index < ANNOTATION_LIMITS.participants; index += 1) { fixture.add(); }
  let overflow = fixture.add();
  assert.equal(overflow.state().self, null);
  assert.equal(overflow.send({
    action: 'cursor',
    point: annotationPoint(),
  }), false);
  assert.equal(new Set(user.state().participants.map((entry) => entry.color)).size, ANNOTATION_LIMITS.participants);
  assert.deepEqual(other.annotations.strokes.size, 0);
});

test('strokes split continuously and expire without persistence, while new viewers receive only current state', (t) => {
  let fixture = annotationsFixture();
  t.after(() => fixture.annotations.close());
  let first = fixture.add();
  first.send({
    action: 'stroke',
    phase: 'start',
    points: [
      annotationPoint(),
    ],
  });
  let initial = first.state().strokes[0];
  assert.ok(initial);
  assert.equal(initial.createdAt, 1_000);
  assert.equal(initial.expiresAt, initial.createdAt + ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs);
  fixture.advance(ANNOTATION_LIMITS.strokeMs);
  first.send({
    action: 'stroke',
    phase: 'append',
    points: [
      {
        ...annotationPoint(),
        x: 0.75,
      },
    ],
  });
  let late = fixture.add();
  let state = late.state();
  assert.equal(state.strokes.length, 2);
  assert.equal(state.strokes[0].ended, true);
  assert.deepEqual(state.strokes[1].points[0], initial.points[0]);
  assert.equal(state.participants[0].point?.x, 0.75);
  fixture.annotations.disconnect(first.page);
  assert.equal(late.state().participants.some((entry) => entry.id === initial.viewerId), false);
  assert.equal(late.messages.some((message) => message.action === 'leave' && message.viewerId === initial.viewerId), true);
  assert.equal(late.state().strokes.length, 2, 'Disconnect retains trails for their remaining fade time.');
  let reconnect = fixture.add();
  assert.notEqual(reconnect.state().self?.id, initial.viewerId);
  assert.notEqual(reconnect.state().self?.color, initial.color);
  fixture.advance(ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs);
  assert.deepEqual(reconnect.state().strokes, []);
  assert.equal(fixture.annotations.pointCount, 0);
});

test('backpressure coalesces missed packets into fresh state, and revision resets reject obsolete input', (t) => {
  let fixture = annotationsFixture();
  t.after(() => fixture.annotations.close());
  let sender = fixture.add();
  let receiver = fixture.add('user');
  let count = receiver.messages.length;
  Reflect.set(receiver.page.socket, 'bufferedAmount', ANNOTATION_LIMITS.bufferBytes + 1);
  for (let index = 0; index < 10; index += 1) {
    sender.send({
      action: 'cursor',
      point: {
        ...annotationPoint(),
        x: index / 10,
      },
    });
  }
  assert.equal(receiver.messages.length, count);
  assert.equal(fixture.annotations.dirty.size, 1);
  Reflect.set(receiver.page.socket, 'bufferedAmount', 0);
  fixture.annotations.sweep();
  assert.equal(receiver.messages.length, count + 1);
  let restored = receiver.messages.at(-1);
  assert.equal(restored?.action, 'state');
  if (restored?.action === 'state') { assert.equal(restored.participants[0].point?.x, 0.9); }
  sender.send({
    action: 'stroke',
    phase: 'start',
    points: [
      annotationPoint(),
    ],
  });
  fixture.annotations.reset(1);
  assert.deepEqual(receiver.state().strokes, []);
  assert.equal(receiver.state().participants[0].point, null);
  assert.equal(sender.send({
    action: 'cursor',
    revision: 0,
    point: annotationPoint(),
  }), false);
  fixture.annotations.close();
  assert.equal(fixture.annotations.timer, undefined);
  assert.equal(fixture.annotations.members.size + fixture.annotations.strokes.size + fixture.annotations.dirty.size, 0);
});

test('annotation rate, sequence, stroke and total point budgets are bounded', (t) => {
  let fixture = annotationsFixture();
  t.after(() => fixture.annotations.close());
  let viewer = fixture.add();
  for (let index = 0; index < ANNOTATION_LIMITS.messagesPerSecond; index += 1) {
    assert.equal(viewer.send({
      action: 'cursor',
      point: annotationPoint(),
    }), true);
  }
  assert.equal(viewer.send({
    action: 'cursor',
    point: null,
  }), false);
  fixture.advance(1_000);
  assert.equal(viewer.send({
    action: 'cursor',
    sequence: ANNOTATION_LIMITS.messagesPerSecond + 1,
    point: null,
  }), false, 'Rate-limited packets cannot be replayed after the rate window resets.');
  assert.equal(viewer.send({
    action: 'cursor',
    sequence: 1,
    point: null,
  }), false);
  for (let index = 0; index < ANNOTATION_LIMITS.strokes + 2; index += 1) {
    fixture.advance(30);
    viewer.send({
      action: 'stroke',
      phase: 'start',
      points: [
        annotationPoint(),
      ],
    });
  }
  assert.equal(fixture.annotations.strokes.size, ANNOTATION_LIMITS.strokes);
  for (let index = 0; index < 160; index += 1) {
    fixture.advance(30);
    viewer.send({
      action: 'stroke',
      phase: 'append',
      points: Array(ANNOTATION_LIMITS.pointsPerMessage).fill(annotationPoint()),
    });
    assert.ok(fixture.annotations.pointCount <= ANNOTATION_LIMITS.points);
  }
  let state = viewer.state();
  assert.ok(state.strokes.length <= ANNOTATION_LIMITS.strokes);
  assert.ok(state.strokes.every((stroke) => stroke.points.length <= ANNOTATION_LIMITS.pointsPerStroke));
  assert.ok(state.strokes.filter((stroke) => !stroke.ended).length <= 1);
  assert.ok(Buffer.byteLength(JSON.stringify(state)) < MAX_PAGE_MESSAGE_BYTES);
  assert.equal(viewer.messages.some((message) => message.action === 'remove'), true);
});
