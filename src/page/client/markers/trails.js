import { ANNOTATION_LIMITS } from '../../../transport/constants.js';

/**
 * @typedef {object} Preview
 * @property {import('../../../../types/transport.js').AnnotationStroke[]} strokes
 * @property {boolean} ended
 * @property {number | undefined} endSequence
 */

/**
 * @param {import('../../../../types/transport.js').AnnotationStroke} stroke
 * @param {number} now
 * @param {boolean} reduced
 */
export function trailFade(stroke, now, reduced = false) {
  if (now >= stroke.expiresAt) { return 0; }
  return reduced ? 1 : Math.min(1, (stroke.expiresAt - now) / ANNOTATION_LIMITS.fadeMs);
}

/**
 * @param {string} viewerId
 * @param {number} sequence
 */
function groupKey(viewerId, sequence) { return `${viewerId}/${sequence}`; }

export class TrailStore {
  /** @type {Map<string, import('../../../../types/transport.js').AnnotationStroke>} */
  strokes = new Map();
  /** @type {Map<string, Preview>} */
  previews = new Map();
  version = 0;
  nextId = 0;

  /** @param {() => number} [now] */
  constructor(now = Date.now) { this.now = now; }

  invalidate() { this.version += 1; }

  /**
   * @param {import('../../../../types/transport.js').AnnotationParticipant} viewer
   * @param {number} sequence
   * @param {import('../../../../types/transport.js').AnnotationPoint[]} points
   */
  preview(viewer, sequence, points) {
    let key = groupKey(viewer.id, sequence);
    let group = this.previews.get(key) || {
      strokes: [],
      ended: false,
      endSequence: undefined,
    };
    this.previews.set(key, group);
    let now = this.now();
    for (let point of points) {
      let stroke = group.strokes.at(-1);
      let previous = stroke?.points.at(-1);
      if (previous && previous.anchor === point.anchor && previous.x === point.x && previous.y === point.y) { continue; }
      if (!stroke || stroke.points.length >= ANNOTATION_LIMITS.pointsPerStroke || now - stroke.createdAt >= ANNOTATION_LIMITS.strokeMs) {
        if (stroke) { stroke.ended = true; }
        stroke = {
          id: `local-${++this.nextId}`,
          viewerId: viewer.id,
          color: viewer.color,
          startSequence: sequence,
          sequence,
          points: previous ? [
            previous,
          ] : [],
          createdAt: now,
          updatedAt: now,
          expiresAt: now,
          ended: false,
        };
        group.strokes.push(stroke);
      }
      stroke.points.push(point);
      stroke.updatedAt = now;
      stroke.expiresAt = now + ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs;
    }
    this.trim();
    this.invalidate();
  }

  /**
   * @param {string} viewerId
   * @param {number} startSequence
   * @param {number} [endSequence]
   */
  end(viewerId, startSequence, endSequence) {
    let group = this.previews.get(groupKey(viewerId, startSequence));
    if (!group) { return; }
    group.ended = true;
    group.endSequence = endSequence;
    let stroke = group.strokes.at(-1);
    if (stroke) {
      stroke.ended = true;
      stroke.updatedAt = this.now();
      stroke.expiresAt = stroke.updatedAt + ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs;
    }
    this.invalidate();
  }

  /**
   * @param {import('../../../../types/transport.js').AnnotationStroke} incoming
   * @param {boolean} append
   */
  accept(incoming, append) {
    let current = this.strokes.get(incoming.id);
    if (current && (incoming.sequence < current.sequence || incoming.sequence === current.sequence && incoming.points.length)) { return; }
    this.strokes.set(incoming.id, {
      ...incoming,
      points: append && current ? [
        ...current.points,
        ...incoming.points,
      ].slice(-ANNOTATION_LIMITS.pointsPerStroke) : incoming.points.slice(),
    });
    let key = groupKey(incoming.viewerId, incoming.startSequence);
    let preview = this.previews.get(key);
    if (incoming.ended && preview?.ended && preview.endSequence !== undefined && incoming.sequence >= preview.endSequence) {
      this.previews.delete(key);
    }
    this.trim();
    this.invalidate();
  }

  /** @param {import('../../../../types/transport.js').AnnotationStroke[]} strokes */
  restore(strokes) {
    this.strokes.clear();
    for (let stroke of strokes) { this.accept(stroke, false); }
    this.expire();
    this.invalidate();
  }

  /** @param {string[]} ids */
  remove(ids) {
    for (let id of ids) { this.strokes.delete(id); }
    this.invalidate();
  }

  expire() {
    let now = this.now();
    for (let stroke of this.strokes.values()) {
      if (stroke.expiresAt <= now) { this.strokes.delete(stroke.id); this.invalidate(); }
    }
    for (let [
      key,
      group,
    ] of this.previews) {
      let remaining = group.strokes.filter((stroke) => stroke.expiresAt > now);
      if (remaining.length !== group.strokes.length) { this.invalidate(); }
      group.strokes = remaining;
      if (!remaining.length) { this.previews.delete(key); }
    }
  }

  /** @param {Map<string, Element>} targets */
  prune(targets) {
    for (let stroke of this.strokes.values()) {
      if (stroke.points.some((point) => !targets.has(point.anchor))) { this.strokes.delete(stroke.id); }
    }
    for (let [
      key,
      group,
    ] of this.previews) {
      group.strokes = group.strokes.filter((stroke) => stroke.points.every((point) => targets.has(point.anchor)));
      if (!group.strokes.length) { this.previews.delete(key); }
    }
    this.invalidate();
  }

  trim() {
    let all = [
      ...this.strokes.values(),
      ...Array.from(this.previews.values()).flatMap((group) => group.strokes),
    ].sort((a, b) => a.createdAt - b.createdAt);
    let points = all.reduce((total, stroke) => total + stroke.points.length, 0);
    let count = all.length;
    let removed = new Set();
    for (let stroke of all) {
      if (count <= ANNOTATION_LIMITS.strokes && points <= ANNOTATION_LIMITS.points) { break; }
      count -= 1;
      points -= stroke.points.length;
      removed.add(stroke.id);
      this.strokes.delete(stroke.id);
    }
    for (let [
      key,
      group,
    ] of this.previews) {
      group.strokes = group.strokes.filter((stroke) => !removed.has(stroke.id));
      if (!group.strokes.length) { this.previews.delete(key); }
    }
  }

  visible() {
    this.expire();
    return [
      ...Array.from(this.strokes.values()).filter((stroke) => !this.previews.has(groupKey(stroke.viewerId, stroke.startSequence))),
      ...Array.from(this.previews.values()).flatMap((group) => group.strokes),
    ];
  }

  clear() {
    this.strokes.clear();
    this.previews.clear();
    this.invalidate();
  }
}
