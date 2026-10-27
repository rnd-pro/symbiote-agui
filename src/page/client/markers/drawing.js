import { PubSub } from '@symbiotejs/symbiote';
import { ANNOTATION_LIMITS, PAGE_ROLE, SESSION_CONTEXT } from '../../../transport/constants.js';
import { updateSessionContext } from '../session-context.js';

/**
 * @typedef {object} StrokeJob
 * @property {import('../../../../types/transport.js').AnnotationParticipant} viewer
 * @property {number} startSequence
 * @property {import('../../../../types/transport.js').AnnotationPoint[]} points
 * @property {boolean} started
 * @property {boolean} ended
 */

export class PointerDrawing {
  /** @type {StrokeJob | undefined} */
  job;
  /** @type {{ id: number, type: string } | undefined} */
  active;
  /** @type {number | undefined} */
  timer;
  /** @type {Document | undefined} */
  document;
  /** @type {{ remove: () => void } | undefined} */
  subscription;
  enabled = false;
  previousTouchAction = '';

  /** @param {import('./client.js').PageMarkers} page */
  constructor(page) { this.page = page; }

  controls() {
    let available = this.page.role === PAGE_ROLE.VIEWER && this.page.ready && !!this.page.self;
    if (!available) { this.cancel(); }
    if (available && !this.subscription) {
      this.subscription = PubSub.getCtx(SESSION_CONTEXT, false)?.sub('annotationDrawing', (value) => {
        this.enabled = value === true;
        if (!this.enabled && this.active?.type !== 'mouse') { this.end(); }
        this.touchAction();
      });
    }
    updateSessionContext({
      annotationAvailable: available,
      ...(available ? {} : {
        annotationDrawing: false,
      }),
    });
  }

  /**
   * @param {Document} doc
   * @param {AddEventListenerOptions} options
   */
  attach(doc, options) {
    if (this.document && this.document !== doc) { this.cancel(); }
    this.document = doc;
    this.previousTouchAction = doc.documentElement.style.touchAction;
    doc.addEventListener('pointerdown', this.down, options);
    doc.addEventListener('pointermove', this.move, options);
    doc.addEventListener('pointerup', this.up, options);
    doc.addEventListener('pointercancel', this.cancelPointer, options);
    doc.addEventListener('lostpointercapture', this.cancelPointer, options);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) { this.suspend(); } }, options);
    this.touchAction();
  }

  touchAction() {
    if (this.document) { this.document.documentElement.style.touchAction = this.enabled ? 'pinch-zoom' : this.previousTouchAction; }
  }

  /** @param {PointerEvent} event */
  down = (event) => {
    let viewer = this.page.self;
    if (!viewer || !this.page.ready || !event.isPrimary || event.button !== 0 || this.active
      || event.pointerType !== 'mouse' && !this.enabled) { return; }
    let point = this.page.geometry?.point(event.clientX, event.clientY);
    if (!point) { return; }
    this.cancel();
    this.page.clearCursor();
    this.job = {
      viewer,
      startSequence: ++this.page.sequence,
      points: [
        point,
      ],
      started: false,
      ended: false,
    };
    this.active = {
      id: event.pointerId,
      type: event.pointerType,
    };
    this.page.trails.preview(viewer, this.job.startSequence, [
      point,
    ]);
    this.page.pointer(event);
    try { this.document?.documentElement.setPointerCapture(event.pointerId); } catch { /* Synthetic/cancelled pointers have no capture. */ }
    event.preventDefault();
    this.schedule();
    this.page.schedule();
  };

  /** @param {PointerEvent} event */
  move = (event) => {
    if (this.active?.id !== event.pointerId || !this.job) { return; }
    if (!(event.buttons & 1)) { this.end(); return; }
    let samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    if (!samples.length) { samples = [
      event,
    ]; }
    for (let sample of samples.slice(-ANNOTATION_LIMITS.pointsPerMessage)) { this.sample(sample); }
    event.preventDefault();
  };

  /** @param {PointerEvent} event */
  sample(event) {
    let job = this.job;
    if (!job || !this.active) { return; }
    let point = this.page.geometry?.point(event.clientX, event.clientY);
    if (!point) { this.end(); return; }
    let previous = job.points.at(-1);
    if (previous && previous.anchor === point.anchor && previous.x === point.x && previous.y === point.y) { return; }
    if (job.points.length >= ANNOTATION_LIMITS.pointsPerMessage * 2) { job.points[job.points.length - 1] = point; }
    else { job.points.push(point); }
    this.page.trails.preview(job.viewer, job.startSequence, [
      point,
    ]);
    this.schedule();
    this.page.schedule();
  }

  /** @param {PointerEvent} event */
  up = (event) => {
    if (this.active?.id !== event.pointerId) { return; }
    this.sample(event);
    this.end();
  };

  /** @param {PointerEvent} event */
  cancelPointer = (event) => {
    if (this.active?.id === event.pointerId) { this.end(); }
  };

  release() {
    let id = this.active?.id;
    this.active = undefined;
    if (id !== undefined && this.document?.documentElement.hasPointerCapture(id)) {
      this.document.documentElement.releasePointerCapture(id);
    }
  }

  end = () => {
    if (!this.active || !this.job) { return; }
    this.release();
    this.job.ended = true;
    this.page.trails.end(this.job.viewer.id, this.job.startSequence);
    this.schedule();
    this.page.schedule();
  };

  schedule() {
    if (this.timer !== undefined) { return; }
    this.timer = window.setTimeout(this.flush, Math.max(0, ANNOTATION_LIMITS.cursorIntervalMs - (performance.now() - this.page.lastSent)));
  }

  flush = () => {
    this.timer = undefined;
    let job = this.job;
    if (!job || !this.page.ready) { return; }
    let points = job.points.splice(0, ANNOTATION_LIMITS.pointsPerMessage);
    if (job.started && !points.length && !job.ended) { return; }
    /** @type {'start' | 'append' | 'end'} */
    let phase = !job.started ? 'start' : job.ended && !job.points.length ? 'end' : 'append';
    let sequence = job.started ? ++this.page.sequence : job.startSequence;
    if (phase === 'end') { this.page.trails.end(job.viewer.id, job.startSequence, sequence); }
    if (!this.page.transmit({
      action: 'stroke',
      phase,
      points,
    }, sequence)) { this.cancel(); return; }
    job.started = true;
    if (phase === 'end') {
      this.job = undefined;
      if (this.page.pending !== undefined) { this.page.queue(this.page.pending); }
    } else if (job.points.length || job.ended) { this.schedule(); }
  };

  cancel() {
    this.release();
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.job) { this.page.trails.end(this.job.viewer.id, this.job.startSequence); }
    this.job = undefined;
  }

  suspend() {
    let job = this.job;
    if (!job?.started || !this.page.ready) { this.cancel(); return; }
    this.release();
    clearTimeout(this.timer);
    this.timer = undefined;
    // Close an already transmitted stroke, without queueing old points while
    // the browser throttles this tab's timers.
    job.points = [];
    job.ended = true;
    this.flush();
  }

  rebase() {
    let job = this.job;
    if (!job) { return; }
    if (!this.active || !this.page.local) { this.cancel(); return; }
    let point = this.page.geometry?.point(this.page.local.x, this.page.local.y);
    if (!point) { this.cancel(); return; }
    clearTimeout(this.timer);
    this.timer = undefined;
    this.page.trails.end(job.viewer.id, job.startSequence);
    this.job = {
      viewer: job.viewer,
      startSequence: ++this.page.sequence,
      points: [
        point,
      ],
      started: false,
      ended: false,
    };
    this.page.trails.preview(job.viewer, this.job.startSequence, [
      point,
    ]);
    this.schedule();
  }

  detach() {
    if (this.document) { this.document.documentElement.style.touchAction = this.previousTouchAction; }
  }

  disconnect() {
    this.cancel();
    this.detach();
    this.subscription?.remove();
    this.subscription = undefined;
    this.document = undefined;
    this.enabled = false;
    updateSessionContext({
      annotationAvailable: false,
      annotationDrawing: false,
    });
  }
}
