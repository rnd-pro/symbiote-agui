import { WebSocket } from 'ws';
import { ANNOTATION_LIMITS, PAGE_ROLE } from '../transport/constants.js';
import { isAnnotationAnchor } from '../transport/annotations.js';
import { STYLESHEET_PATH } from '../markup/constants.js';
import { PageAnnotations } from './page-annotations.js';

export class SharedPages {
  enabled = false;
  revision = 0;
  viewSequence = 0;
  /** @type {import('../../types/transport.js').MirrorSnapshot | undefined} */
  latest;
  /** @type {Set<WebSocket>} */
  sending = new Set();

  /** @param {Map<string, import('../../types/tools.js').PagePeer>} pages */
  constructor(pages) {
    this.pages = pages;
    this.annotations = new PageAnnotations(pages);
  }

  user() {
    return [...this.pages.values()].find((page) => page.role === PAGE_ROLE.USER && page.socket.readyState === WebSocket.OPEN);
  }

  /** @param {number} revision */
  enable(revision) {
    if (this.enabled) { return; }
    this.enabled = true;
    this.revision = revision;
    this.annotations.reset(revision);
    for (let page of this.pages.values()) { this.assign(page); }
  }

  /** @param {import('../../types/tools.js').PagePeer} page */
  assign(page) {
    if (!this.enabled) { return; }
    page.role = !page.viewerRequested && !this.user() ? PAGE_ROLE.USER : PAGE_ROLE.VIEWER;
    this.notify();
    if (page.role === PAGE_ROLE.VIEWER) { this.send(page.socket); }
    this.annotations.connect(page);
  }

  notify() {
    if (!this.enabled) { return; }
    let userConnected = !!this.user();
    for (let page of this.pages.values()) {
      if (page.socket.readyState !== WebSocket.OPEN || !page.role) { continue; }
      page.socket.send(JSON.stringify({
        type: 'role', role: page.role, userConnected,
        revision: this.revision, capture: page.ready,
        viewSequence: this.viewSequence,
      }));
    }
  }

  /** @param {number} revision */
  reset(revision) {
    this.revision = revision;
    this.annotations.reset(revision);
    this.latest = {
      html: '',
      revision,
      sequence: this.viewSequence,
      anchors: [],
      stylesheetUrl: `${STYLESHEET_PATH}?revision=${revision}`,
    };
    if (this.enabled) {
      for (let page of this.pages.values()) {
        if (page.role === PAGE_ROLE.VIEWER) { this.send(page.socket); }
      }
    }
  }

  /**
   * @param {import('../../types/tools.js').PagePeer} page
   * @param {import('../../types/transport.js').MirrorSnapshot} snapshot
   */
  publish(page, snapshot) {
    if (!this.enabled || this.user() !== page) { throw new Error('Only the user can publish a live view.'); }
    if (typeof snapshot.html !== 'string' || !Number.isSafeInteger(snapshot.revision) ||
      (snapshot.rootStyles !== undefined && typeof snapshot.rootStyles !== 'string') ||
      (snapshot.theme !== undefined && !['system', 'light', 'dark'].includes(snapshot.theme)) ||
      ![STYLESHEET_PATH, `${STYLESHEET_PATH}?revision=${snapshot.revision}`].includes(snapshot.stylesheetUrl)) {
      throw new Error('Invalid live view.');
    }
    if (snapshot.revision !== this.revision) { return; }
    if (snapshot.sequence !== undefined) {
      if (!Number.isSafeInteger(snapshot.sequence) || snapshot.sequence < 1 || !isAnnotationAnchor(snapshot.rootAnchor)
        || !Array.isArray(snapshot.anchors) || snapshot.anchors.length > ANNOTATION_LIMITS.anchors
        || !snapshot.anchors.every(isAnnotationAnchor) || !snapshot.anchors.includes(snapshot.rootAnchor || '')
        || new Set(snapshot.anchors).size !== snapshot.anchors.length) { throw new Error('Invalid snapshot anchors.'); }
      if (snapshot.sequence <= this.viewSequence) { return; }
    } else if (snapshot.anchors !== undefined || snapshot.rootAnchor !== undefined) { throw new Error('Snapshot anchors require a sequence.'); }
    this.viewSequence = snapshot.sequence ?? this.viewSequence + 1;
    this.latest = {
      html: snapshot.html,
      revision: snapshot.revision,
      stylesheetUrl: snapshot.stylesheetUrl,
      rootStyles: snapshot.rootStyles ?? '',
      theme: snapshot.theme ?? 'system',
      sequence: this.viewSequence,
      anchors: snapshot.anchors ?? [],
      rootAnchor: snapshot.rootAnchor,
    };
    for (let viewer of this.pages.values()) {
      if (viewer.role === PAGE_ROLE.VIEWER) { this.send(viewer.socket); }
    }
    this.annotations.setView(this.viewSequence, this.latest.anchors || []);
  }

  /** @param {WebSocket} socket */
  send(socket) {
    let snapshot = this.latest;
    if (!snapshot || this.sending.has(socket) || socket.readyState !== WebSocket.OPEN) { return; }
    this.sending.add(socket);
    socket.send(JSON.stringify({ type: 'snapshot', ...snapshot }), (error) => {
      this.sending.delete(socket);
      if (error) { socket.terminate(); return; }
      if (this.latest !== snapshot) { this.send(socket); }
    });
  }

  close() {
    this.annotations.close();
    this.enabled = false;
    this.latest = undefined;
    this.sending.clear();
  }
}
