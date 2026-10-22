import { WebSocket } from 'ws';
import { PAGE_ROLE } from '../transport/constants.js';
import { STYLESHEET_PATH } from '../markup/constants.js';

export class SharedPages {
  enabled = false;
  revision = 0;
  /** @type {import('../../types/transport.js').MirrorSnapshot | undefined} */
  latest;
  /** @type {Set<WebSocket>} */
  sending = new Set();

  /** @param {Map<string, import('../../types/tools.js').PagePeer>} pages */
  constructor(pages) {
    this.pages = pages;
  }

  user() {
    return [...this.pages.values()].find((page) => page.role === PAGE_ROLE.USER && page.socket.readyState === WebSocket.OPEN);
  }

  /** @param {number} revision */
  enable(revision) {
    if (this.enabled) { return; }
    this.enabled = true;
    this.revision = revision;
    for (let page of this.pages.values()) { this.assign(page); }
  }

  /** @param {import('../../types/tools.js').PagePeer} page */
  assign(page) {
    if (!this.enabled) { return; }
    page.role = !page.viewerRequested && !this.user() ? PAGE_ROLE.USER : PAGE_ROLE.VIEWER;
    this.notify();
    if (page.role === PAGE_ROLE.VIEWER) { this.send(page.socket); }
  }

  notify() {
    if (!this.enabled) { return; }
    let userConnected = !!this.user();
    for (let page of this.pages.values()) {
      if (page.socket.readyState !== WebSocket.OPEN || !page.role) { continue; }
      page.socket.send(JSON.stringify({
        type: 'role', role: page.role, userConnected,
        revision: this.revision, capture: page.ready,
      }));
    }
  }

  /** @param {number} revision */
  reset(revision) {
    this.revision = revision;
    this.latest = { html: '', revision, stylesheetUrl: `${STYLESHEET_PATH}?revision=${revision}` };
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
      ![STYLESHEET_PATH, `${STYLESHEET_PATH}?revision=${this.revision}`].includes(snapshot.stylesheetUrl)) {
      throw new Error('Invalid live view.');
    }
    if (snapshot.revision !== this.revision) { return; }
    this.latest = {
      html: snapshot.html,
      revision: snapshot.revision,
      stylesheetUrl: snapshot.stylesheetUrl,
      rootStyles: snapshot.rootStyles ?? '',
      theme: snapshot.theme ?? 'system',
    };
    for (let viewer of this.pages.values()) {
      if (viewer.role === PAGE_ROLE.VIEWER) { this.send(viewer.socket); }
    }
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
}
