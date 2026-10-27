import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { ANNOTATION_LIMITS, PAGE_ROLE } from '../transport/constants.js';
import { validateAnnotation } from '../transport/annotations.js';

/**
 * @typedef {object} AnnotationMember
 * @property {import('../../types/transport.js').AnnotationPresence} presence
 * @property {number} sequence
 * @property {number} window
 * @property {number} messages
 * @property {string | undefined} active
 */

export class PageAnnotations {
  /** @type {Map<import('../../types/tools.js').PagePeer, AnnotationMember>} */
  members = new Map();
  /** @type {Map<string, import('../../types/transport.js').AnnotationStroke>} */
  strokes = new Map();
  /** @type {Set<import('../../types/tools.js').PagePeer>} */
  dirty = new Set();
  /** @type {ReturnType<typeof setInterval> | undefined} */
  timer;
  revision = 0;
  viewSequence = 0;
  /** @type {Set<string>} */
  anchors = new Set();
  pointCount = 0;
  colorIndex = 0;
  disposed = false;

  /**
   * @param {Map<string, import('../../types/tools.js').PagePeer>} pages
   * @param {() => number} [now]
   */
  constructor(pages, now = Date.now) {
    this.pages = pages;
    this.now = now;
  }

  color() {
    let used = new Set([
      ...Array.from(this.members.values(), (member) => member.presence.color),
      ...Array.from(this.strokes.values(), (stroke) => stroke.color),
    ]);
    let color;
    do { color = `hsl(${this.colorIndex++ * 137 % 360} 80% 50%)`; }
    while (used.has(color));
    return color;
  }

  /** @param {import('../../types/tools.js').PagePeer} page */
  connect(page) {
    if (this.disposed || !page.role || !Array.from(this.pages.values()).includes(page)) { return; }
    this.sweep();
    this.timer ??= setInterval(() => this.sweep(), ANNOTATION_LIMITS.sweepMs);
    this.timer.unref();
    if (page.role === PAGE_ROLE.VIEWER && !this.members.has(page) && this.members.size < ANNOTATION_LIMITS.participants) {
      let presence = {
        id: randomUUID(),
        color: this.color(),
        point: null,
        updatedAt: this.now(),
      };
      this.members.set(page, {
        presence,
        sequence: 0,
        window: this.now(),
        messages: 0,
        active: undefined,
      });
      this.broadcast({
        ...this.header(),
        action: 'join',
        participant: presence,
      }, page);
    }
    this.sendState(page);
  }

  header() {
    return {
      type: /** @type {const} */ ('annotations'),
      revision: this.revision,
      time: this.now(),
      viewSequence: this.viewSequence,
    };
  }

  /** @param {import('../../types/tools.js').PagePeer} page */
  sendState(page) {
    let presence = this.members.get(page)?.presence;
    this.send(page, {
      ...this.header(),
      action: 'state',
      self: presence ? {
        id: presence.id,
        color: presence.color,
      } : null,
      participants: Array.from(this.members.values(), (member) => member.presence),
      strokes: Array.from(this.strokes.values()),
    });
  }

  /**
   * @param {import('../../types/tools.js').PagePeer} page
   * @param {import('../../types/transport.js').AnnotationServerMessage} message
   */
  send(page, message) {
    let socket = page.socket;
    if (this.disposed || socket.readyState !== WebSocket.OPEN) { return; }
    // Keep current state, never a queue of outdated cursor/stroke packets.
    if (socket.bufferedAmount > ANNOTATION_LIMITS.bufferBytes) {
      this.dirty.add(page);
      return;
    }
    this.dirty.delete(page);
    socket.send(JSON.stringify(message), (error) => { if (error) { socket.terminate(); } });
  }

  /**
   * @param {import('../../types/transport.js').AnnotationServerMessage} message
   * @param {import('../../types/tools.js').PagePeer} [except]
   */
  broadcast(message, except) {
    for (let page of this.pages.values()) {
      if (page !== except && page.role) {
        if (this.dirty.has(page)) { this.sendState(page); }
        else { this.send(page, message); }
      }
    }
  }

  /**
   * @param {import('../../types/tools.js').PagePeer} page
   * @param {unknown} value
   * @param {number} bytes
   */
  receive(page, value, bytes) {
    if (this.disposed || page.role !== PAGE_ROLE.VIEWER || !Array.from(this.pages.values()).includes(page)) {
      throw new Error('Only connected viewers can publish annotations.');
    }
    let packet = validateAnnotation(value, bytes);
    let member = this.members.get(page);
    if (!member) { return false; }
    let now = this.now();
    if (now - member.window >= 1_000) {
      member.window = now;
      member.messages = 0;
    }
    member.messages += 1;
    if (packet.sequence <= member.sequence) { return false; }
    member.sequence = packet.sequence;
    if (member.messages > ANNOTATION_LIMITS.messagesPerSecond) { return false; }
    this.sweep();
    if (packet.revision !== this.revision) { return false; }
    if (packet.action === 'sync') { this.sendState(page); return true; }
    if (packet.viewSequence !== this.viewSequence) { return false; }
    let points = packet.action === 'cursor' ? packet.point ? [
      packet.point,
    ] : [] : packet.points;
    if (points.some((point) => !this.anchors.has(point.anchor))) { return false; }
    if (packet.action === 'cursor') {
      member.presence.point = packet.point;
      member.presence.updatedAt = now;
      if (!packet.point) { this.finish(member, false); }
      this.broadcast({
        ...this.header(),
        action: 'cursor',
        viewerId: member.presence.id,
        point: packet.point,
      });
    } else { this.stroke(member, packet); }
    return true;
  }

  /**
   * @param {AnnotationMember} member
   * @param {Extract<import('../../types/transport.js').AnnotationPageMessage, { action: 'stroke' }>} packet
   */
  stroke(member, packet) {
    if (packet.phase !== 'start' && !member.active) { return; }
    let stroke = member.active ? this.strokes.get(member.active) : undefined;
    if (packet.phase === 'start') { this.finish(member, false); stroke = undefined; }
    let points = packet.points.map((point) => ({
      ...point,
    }));
    if (points.length) {
      let now = this.now();
      if (stroke && (now - stroke.createdAt >= ANNOTATION_LIMITS.strokeMs
        || stroke.points.length + points.length > ANNOTATION_LIMITS.pointsPerStroke)) {
        let last = stroke.points.at(-1);
        if (last) { points.unshift(last); }
        this.finish(member, false);
        stroke = undefined;
      }
      let append = !!stroke;
      stroke ??= {
        id: randomUUID(),
        viewerId: member.presence.id,
        color: member.presence.color,
        points: [],
        createdAt: now,
        updatedAt: now,
        expiresAt: now,
        ended: false,
      };
      stroke.points.push(...points);
      stroke.updatedAt = now;
      stroke.expiresAt = now + ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs;
      this.strokes.set(stroke.id, stroke);
      this.pointCount += points.length;
      member.active = stroke.id;
      member.presence.point = points.at(-1) ?? null;
      member.presence.updatedAt = now;
      let removed = this.trim();
      this.broadcast({
        ...this.header(),
        action: 'stroke',
        append,
        stroke: {
          ...stroke,
          points,
        },
      });
      if (removed.length) {
        this.broadcast({
          ...this.header(),
          action: 'remove',
          ids: removed,
        });
      }
    }
    if (packet.phase === 'end') { this.finish(member, true); }
  }

  /**
   * @param {AnnotationMember} member
   * @param {boolean} extend
   */
  finish(member, extend) {
    let stroke = member.active ? this.strokes.get(member.active) : undefined;
    member.active = undefined;
    if (!stroke) { return; }
    stroke.ended = true;
    if (extend) {
      stroke.updatedAt = this.now();
      stroke.expiresAt = stroke.updatedAt + ANNOTATION_LIMITS.holdMs + ANNOTATION_LIMITS.fadeMs;
    }
    this.broadcast({
      ...this.header(),
      action: 'stroke',
      append: true,
      stroke: {
        ...stroke,
        points: [],
      },
    });
  }

  /** @param {string} id */
  drop(id) {
    this.pointCount -= this.strokes.get(id)?.points.length ?? 0;
    this.strokes.delete(id);
  }

  trim() {
    let ids = [];
    for (let id of this.strokes.keys()) {
      if (this.strokes.size <= ANNOTATION_LIMITS.strokes && this.pointCount <= ANNOTATION_LIMITS.points) { break; }
      this.drop(id);
      ids.push(id);
    }
    return ids;
  }

  sweep() {
    let now = this.now();
    for (let [
      id,
      stroke,
    ] of this.strokes) {
      if (stroke.expiresAt <= now) { this.drop(id); }
    }
    for (let page of this.dirty) { this.sendState(page); }
  }

  /** @param {import('../../types/tools.js').PagePeer} page */
  disconnect(page) {
    let member = this.members.get(page);
    this.dirty.delete(page);
    if (!member) { return; }
    this.members.delete(page);
    this.finish(member, false);
    this.broadcast({
      ...this.header(),
      action: 'leave',
      viewerId: member.presence.id,
    });
  }

  /** @param {number} revision */
  reset(revision) {
    this.revision = revision;
    this.anchors.clear();
    this.strokes.clear();
    this.pointCount = 0;
    for (let member of this.members.values()) {
      member.active = undefined;
      member.presence.point = null;
      member.presence.updatedAt = this.now();
    }
    this.broadcast({
      ...this.header(),
      action: 'reset',
    });
  }

  /**
   * @param {number} sequence
   * @param {string[]} anchors
   */
  setView(sequence, anchors) {
    this.viewSequence = sequence;
    this.anchors = new Set(anchors);
    for (let member of this.members.values()) {
      if (member.presence.point && !this.anchors.has(member.presence.point.anchor)) { member.presence.point = null; }
    }
    for (let [
      id,
      stroke,
    ] of this.strokes) {
      if (stroke.points.some((point) => !this.anchors.has(point.anchor))) { this.drop(id); }
    }
    this.broadcast({
      ...this.header(),
      action: 'view',
    });
  }

  close() {
    this.disposed = true;
    clearInterval(this.timer);
    this.timer = undefined;
    this.members.clear();
    this.strokes.clear();
    this.dirty.clear();
    this.anchors.clear();
    this.pointCount = 0;
  }
}
