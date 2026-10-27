import { ANNOTATION_LIMITS, PAGE_ROLE } from '../../../transport/constants.js';
import { MarkerGeometry } from './geometry.js';
import { MarkerLayer } from './layer.js';

/** @typedef {import('../../../../types/transport.js').AnnotationPresence & { viewSequence: number }} Presence */

export class PageMarkers {
  /** @type {import('../../../../types/transport.js').PageRole | undefined} */
  role;
  /** @type {import('../../../../types/transport.js').AnnotationParticipant | null} */
  self = null;
  /** @type {Map<string, Presence>} */
  participants = new Map();
  /** @type {MarkerGeometry | undefined} */
  geometry;
  /** @type {MarkerLayer | undefined} */
  layer;
  /** @type {AbortController | undefined} */
  listeners;
  /** @type {ResizeObserver | undefined} */
  resize;
  /** @type {{ x: number, y: number } | undefined} */
  local;
  /** @type {Map<string, { x: number, y: number }>} */
  positions = new Map();
  /** @type {number | undefined} */
  sendTimer;
  /** @type {import('../../../../types/transport.js').AnnotationPoint | null | undefined} */
  pending;
  revision = -1;
  viewSequence = -1;
  sequence = 0;
  frame = 0;
  lastFrame = 0;
  lastSent = 0;
  ready = false;
  previousCursor = '';
  /** @type {{ x: number, y: number } | undefined} */
  touch;
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /** @param {(message: string) => boolean} send */
  constructor(send) { this.send = send; }

  /**
   * @param {HTMLElement} root
   * @param {Map<string, Element>} targets
   * @param {number} revision
   * @param {number} sequence
   */
  setView(root, targets, revision, sequence) {
    this.detach();
    this.geometry = new MarkerGeometry(root);
    this.geometry.targets = targets;
    this.revision = revision;
    this.viewSequence = sequence;
    this.ready = sequence > 0 && targets.size > 0;
    let doc = root.ownerDocument;
    this.listeners = new AbortController();
    let options = {
      signal: this.listeners.signal,
      capture: true,
    };
    let layout = () => {
      this.geometry?.invalidate();
      this.positions.clear();
      if (this.local && this.self && this.ready) { this.queue(this.geometry?.point(this.local.x, this.local.y) || null); }
      this.schedule();
    };
    doc.addEventListener('scroll', layout, options);
    doc.addEventListener('load', layout, options);
    doc.defaultView?.addEventListener('resize', layout, options);
    doc.defaultView?.visualViewport?.addEventListener('resize', layout, options);
    doc.defaultView?.visualViewport?.addEventListener('scroll', layout, options);
    if (doc !== document) {
      document.addEventListener('scroll', layout, options);
      window.addEventListener('resize', layout, options);
      window.visualViewport?.addEventListener('resize', layout, options);
      window.visualViewport?.addEventListener('scroll', layout, options);
    }
    this.resize = new ResizeObserver(layout);
    for (let target of targets.values()) { this.resize.observe(target); }
    if (this.role === PAGE_ROLE.VIEWER) {
      this.previousCursor = doc.documentElement.style.cursor;
      doc.addEventListener('pointermove', this.pointer, options);
      doc.documentElement.addEventListener('pointerleave', this.leave, options);
      doc.addEventListener('wheel', this.wheel, {
        ...options,
        passive: false,
      });
      doc.addEventListener('touchstart', (event) => {
        let touch = event.touches.length === 1 ? event.touches[0] : undefined;
        this.touch = touch ? {
          x: touch.clientX,
          y: touch.clientY,
        } : undefined;
      }, options);
      doc.addEventListener('touchmove', (event) => {
        let previous = this.touch;
        let touch = event.touches.length === 1 ? event.touches[0] : undefined;
        if (!previous || !touch) { this.touch = undefined; return; }
        let dx = previous.x - touch.clientX;
        let dy = previous.y - touch.clientY;
        this.touch = {
          x: touch.clientX,
          y: touch.clientY,
        };
        if (this.geometry?.scroll(touch.clientX, touch.clientY, dx, dy)) { event.preventDefault(); }
      }, {
        ...options,
        passive: false,
      });
    }
    document.addEventListener('toggle', (event) => {
      if (event.target !== this.layer) { this.layer?.raise(); }
    }, options);
    this.cursor();
    layout();
    this.schedule();
  }

  cursor() {
    let doc = this.geometry?.root.ownerDocument;
    if (doc && this.role === PAGE_ROLE.VIEWER) {
      doc.documentElement.style.cursor = this.self && this.ready && this.local ? 'none' : this.previousCursor;
    }
  }

  /** @param {PointerEvent} event */
  pointer = (event) => {
    if (!this.self || !this.ready || event.pointerType === 'touch') { return; }
    this.local = {
      x: event.clientX,
      y: event.clientY,
    };
    this.cursor();
    this.queue(this.geometry?.point(event.clientX, event.clientY) || null);
    this.schedule();
  };

  leave = () => {
    this.local = undefined;
    this.touch = undefined;
    this.cursor();
    this.queue(null);
    this.schedule();
  };

  /** @param {WheelEvent} event */
  wheel = (event) => {
    if (event.ctrlKey || event.metaKey) { return; }
    let scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.geometry?.root.clientHeight || 1 : 1;
    let dx = (event.deltaX || (event.shiftKey ? event.deltaY : 0)) * scale;
    let dy = (event.shiftKey ? 0 : event.deltaY) * scale;
    if (this.geometry?.scroll(event.clientX, event.clientY, dx, dy)) { event.preventDefault(); }
  };

  /** @param {import('../../../../types/transport.js').AnnotationPoint | null} point */
  queue(point) {
    this.pending = point;
    if (this.sendTimer !== undefined) { return; }
    this.sendTimer = window.setTimeout(() => {
      this.sendTimer = undefined;
      if (!this.self || !this.ready || this.pending === undefined) { return; }
      let packet = {
        type: 'annotation',
        action: 'cursor',
        revision: this.revision,
        viewSequence: this.viewSequence,
        sequence: ++this.sequence,
        point: this.pending,
      };
      this.pending = undefined;
      this.lastSent = performance.now();
      this.send(JSON.stringify(packet));
    }, Math.max(0, ANNOTATION_LIMITS.cursorIntervalMs - (performance.now() - this.lastSent)));
  }

  /** @param {import('../../../../types/transport.js').AnnotationServerMessage} message */
  receive(message) {
    if (message.action === 'state') {
      if (message.self?.id !== this.self?.id) { this.sequence = 0; this.local = undefined; }
      this.self = message.self;
      this.participants = new Map(message.participants.map((presence) => [
        presence.id,
        {
          ...presence,
          viewSequence: message.viewSequence,
        },
      ]));
      this.cursor();
    } else if (message.action === 'join') {
      this.participants.set(message.participant.id, {
        ...message.participant,
        viewSequence: message.viewSequence,
      });
    } else if (message.action === 'leave') {
      this.participants.delete(message.viewerId);
      this.positions.delete(message.viewerId);
    } else if (message.action === 'reset') {
      this.ready = false;
      this.local = undefined;
      for (let presence of this.participants.values()) { presence.point = null; }
      this.cursor();
    } else if (message.action === 'view') {
      for (let presence of this.participants.values()) { presence.viewSequence = message.viewSequence; }
    } else if (message.action === 'cursor' && message.viewSequence >= this.viewSequence) {
      let presence = this.participants.get(message.viewerId);
      if (presence) {
        presence.point = message.point;
        presence.viewSequence = message.viewSequence;
      }
    }
    this.schedule();
  }

  schedule() {
    if (!this.frame) { this.frame = requestAnimationFrame(this.paint); }
  }

  paint = (time = performance.now()) => {
    this.frame = 0;
    let factor = this.reducedMotion.matches ? 1 : 1 - Math.exp(-Math.max(16, time - this.lastFrame) / 50);
    this.lastFrame = time;
    let moving = false;
    let markers = [];
    for (let presence of this.participants.values()) {
      let own = presence.id === this.self?.id;
      let local = own && this.local;
      let target = own ? local && this.ready ? this.geometry?.screen(local.x, local.y) : undefined
        : this.ready && presence.point && presence.viewSequence === this.viewSequence ? this.geometry?.project(presence.point) : undefined;
      if (!target) { continue; }
      let previous = !local && this.positions.get(presence.id);
      if (previous && Math.hypot(target.x - previous.x, target.y - previous.y) > 0.1) {
        target = {
          x: previous.x + (target.x - previous.x) * factor,
          y: previous.y + (target.y - previous.y) * factor,
        };
        moving = true;
      }
      this.positions.set(presence.id, target);
      markers.push({
        id: presence.id,
        color: presence.color,
        x: target.x,
        y: target.y,
        position: `${target.x}px ${target.y}px`,
      });
    }
    if (!this.layer && markers.length) {
      this.layer = /** @type {MarkerLayer} */ (document.createElement('agui-viewer-markers'));
      document.body.append(this.layer);
    }
    if (this.layer) { this.layer.$.markers = markers; }
    if (moving) { this.schedule(); }
  };

  detach() {
    if (this.geometry && this.role === PAGE_ROLE.VIEWER) { this.geometry.root.ownerDocument.documentElement.style.cursor = this.previousCursor; }
    this.listeners?.abort();
    this.resize?.disconnect();
    this.positions.clear();
  }

  disconnect() {
    this.detach();
    clearTimeout(this.sendTimer);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.sendTimer = undefined;
    this.pending = undefined;
    this.local = undefined;
    this.touch = undefined;
    this.self = null;
    this.ready = false;
    this.participants.clear();
    this.layer?.remove();
    this.layer = undefined;
    this.geometry = undefined;
    this.sequence = 0;
  }
}
