import assert from 'node:assert/strict';
import test from 'node:test';
import { ANNOTATION_LIMITS } from '../../src/transport/constants.js';
import { TrailStore, trailFade } from '../../src/page/client/markers/trails.js';
import { annotationPoint } from './annotations-fixture.js';

/**
 * @param {Partial<import('../../types/transport.js').AnnotationStroke>} [values]
 * @returns {import('../../types/transport.js').AnnotationStroke}
 */
function stroke(values = {}) {
  return {
    id: 'server-stroke',
    viewerId: 'viewer',
    color: '#aabbcc',
    startSequence: 1,
    sequence: 1,
    points: [
      annotationPoint(),
    ],
    createdAt: 0,
    updatedAt: 0,
    expiresAt: ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs,
    ended: false,
    ...values,
  };
}

test('local drawing is visible before acknowledgement and reconciles without duplicated paths', () => {
  let now = 0;
  let store = new TrailStore(() => now);
  let viewer = {
    id: 'viewer',
    color: '#aabbcc',
  };
  store.preview(viewer, 1, [
    annotationPoint(),
    {
      ...annotationPoint(),
      x: 0.75,
    },
  ]);
  assert.equal(store.visible().length, 1);
  assert.equal(store.visible()[0].points.length, 2);
  store.accept(stroke(), false);
  assert.equal(store.visible().length, 1);
  assert.equal(store.visible()[0].points.length, 2);
  now = 100;
  store.end(viewer.id, 1, 3);
  store.accept(stroke({
    sequence: 2,
    points: [
      {
        ...annotationPoint(),
        x: 0.75,
      },
    ],
  }), true);
  assert.equal(store.previews.size, 1);
  store.accept(stroke({
    sequence: 3,
    points: [],
    ended: true,
  }), true);
  assert.equal(store.previews.size, 0);
  assert.equal(store.visible().length, 1);
  assert.equal(store.visible()[0].id, 'server-stroke');
  assert.equal(store.visible()[0].points.length, 2);
  store.accept(stroke({
    sequence: 2,
  }), true);
  assert.equal(store.visible()[0].points.length, 2, 'Older point batches cannot be replayed.');
});

test('trails hold, fade and expire from timestamps, including reduced motion and background pauses', () => {
  let now = 0;
  let store = new TrailStore(() => now);
  let entry = stroke();
  store.restore([
    entry,
  ]);
  assert.equal(trailFade(entry, ANNOTATION_LIMITS.holdMs), 1);
  assert.equal(trailFade(entry, ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs / 2), 0.5);
  assert.equal(trailFade(entry, ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs / 2, true), 1);
  now = entry.expiresAt;
  assert.equal(trailFade(entry, now, true), 0);
  assert.deepEqual(store.visible(), []);
  store.restore([
    entry,
  ]);
  now += 60_000;
  assert.deepEqual(store.visible(), []);
});

test('snapshot replacement keeps valid trails and retires invalid anchors and evicted history', () => {
  let store = new TrailStore(() => 0);
  store.restore([
    stroke(),
  ]);
  /** @type {Map<string, Element>} */
  let targets = new Map();
  targets.set('fixture-anchor', /** @type {Element} */ ({}));
  store.prune(targets);
  assert.equal(store.visible().length, 1);
  store.prune(new Map());
  assert.equal(store.visible().length, 0);
  store.restore([
    stroke(),
  ]);
  store.remove([
    'server-stroke',
  ]);
  assert.equal(store.visible().length, 0);
});

test('long local gestures split and the combined preview/replay buffers stay bounded', () => {
  let now = 0;
  let store = new TrailStore(() => now);
  let viewer = {
    id: 'viewer',
    color: '#aabbcc',
  };
  for (let index = 0; index < ANNOTATION_LIMITS.points + 100; index += 1) {
    now += 0.1;
    store.preview(viewer, 1, [
      {
        ...annotationPoint(),
        x: (index % 100) / 100,
      },
    ]);
  }
  for (let index = 0; index < 100; index += 1) {
    store.accept(stroke({
      id: `remote-${index}`,
      viewerId: 'another-viewer',
      startSequence: index + 1,
    }), false);
  }
  let visible = store.visible();
  assert.ok(visible.length <= ANNOTATION_LIMITS.strokes);
  assert.ok(visible.reduce((count, entry) => count + entry.points.length, 0) <= ANNOTATION_LIMITS.points);
  assert.ok(visible.every((entry) => entry.points.length <= ANNOTATION_LIMITS.pointsPerStroke));
  now += ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs;
  assert.equal(store.visible().length, 0);
  assert.equal(store.previews.size + store.strokes.size, 0);
});
