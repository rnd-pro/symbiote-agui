import { html } from '@symbiotejs/symbiote/core/html.js';
import { COMPONENT_TAG, CONTENT_ROOT_ID, PAGE_TEXT_CONTEXT } from '../../markup/constants.js';
import { MAX_PAGE_MESSAGE_BYTES, MIRROR_INTERVAL_MS, MIRROR_REFRESH_MS, PAGE_ROLE } from '../../transport/constants.js';
import { disposeModules } from './modules.js';
import { replaceContent } from './replace-content.js';
import { captureSnapshot } from './mirror-snapshot.js';
import { SnapshotAnchors, mirroredAnchors } from './markers/anchors.js';
import { PageMarkers } from './markers/client.js';
import { watchScrollbarActivity } from './uilib/shared/scrollbars.js';

export class SharedView {
  /** @type {import('../../../types/transport.js').PageRole | undefined} */
  role;
  userConnected = false;
  revision = -1;
  previous = '';
  rendered = false;
  viewSequence = 0;
  anchors = new SnapshotAnchors();
  /** @type {number | undefined} */
  timer;
  /** @type {number | undefined} */
  refresh;
  /** @type {MutationObserver | undefined} */
  observer;
  /** @type {HTMLIFrameElement | undefined} */
  frame;
  /** @type {(() => void) | undefined} */
  stopFrameScrollbars;
  /** @type {import('../../../types/transport.js').MirrorSnapshot | undefined} */
  snapshot;

  /**
   * @param {(message: string) => boolean} send
   * @param {(message: string) => void} report
   */
  constructor(send, report) {
    this.send = send;
    this.report = report;
    this.markers = new PageMarkers(send);
    this.schedule = () => {
      if (this.timer !== undefined) { return; }
      this.timer = window.setTimeout(() => { this.timer = undefined; this.publish(); }, MIRROR_INTERVAL_MS);
    };
  }

  label() {
    if (!this.role) { return ''; }
    return this.role === PAGE_ROLE.USER ? 'User mode' : this.userConnected ? 'Viewer mode - live' : 'Viewer mode - waiting for the user';
  }

  /** @param {import('../../../types/transport.js').PageRoleMessage} message */
  async setRole(message) {
    let previous = this.role;
    this.role = message.role;
    this.userConnected = message.userConnected;
    this.viewSequence = Math.max(this.viewSequence, message.viewSequence ?? 0);
    if (this.role === PAGE_ROLE.VIEWER && previous !== this.role) {
      this.disconnect();
      await disposeModules();
      if (this.rendered) {
        location.reload();
        return;
      }
      let root = document.getElementById(CONTENT_ROOT_ID);
      if (root) {
        replaceContent(root, document.createDocumentFragment());
        root.append(this.createToolbar());
      }
    }
    this.markers.role = this.role;
    if (this.role === PAGE_ROLE.USER) {
      if (message.capture) { this.revision = message.revision; }
      this.observe();
      this.publish();
    }
  }

  observe() {
    let root = document.getElementById(CONTENT_ROOT_ID);
    if (this.observer || !root) { return; }
    this.observer = new MutationObserver(this.schedule);
    this.observer.observe(root, { subtree: true, attributes: true, childList: true, characterData: true });
    this.observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    root.addEventListener('input', this.schedule, true);
    root.addEventListener('change', this.schedule, true);
    root.addEventListener('toggle', this.schedule, true);
    this.refresh = window.setInterval(() => this.publish(), MIRROR_REFRESH_MS);
  }

  publish() {
    if (this.role !== PAGE_ROLE.USER || this.revision < 0) { return; }
    let snapshot = captureSnapshot(this.revision, this.anchors);
    if (!snapshot) { return; }
    let content = JSON.stringify(snapshot);
    if (content === this.previous) { return; }
    let sequence = this.viewSequence + 1;
    let message = JSON.stringify({
      type: 'snapshot',
      ...snapshot,
      sequence,
    });
    if (new TextEncoder().encode(message).byteLength > MAX_PAGE_MESSAGE_BYTES) {
      this.report('The live view exceeds 1 MiB. Simplify the interface to resume viewer updates.');
      return;
    }
    if (this.send(message)) {
      this.previous = content;
      this.viewSequence = sequence;
      let root = document.getElementById(CONTENT_ROOT_ID);
      if (root) { this.markers.setView(root, this.anchors.targets, this.revision, sequence); }
    }
  }

  /** @param {import('../../../types/transport.js').MirrorSnapshot} snapshot */
  display(snapshot) {
    if (this.role !== PAGE_ROLE.VIEWER) { return; }
    this.snapshot = snapshot;
    if (!this.frame) {
      let frame = document.createElement('iframe');
      frame.title = 'Live view of the user interface';
      frame.id = 'agui-viewer';
      frame.setAttribute('sandbox', 'allow-same-origin');
      frame.style.cssText = 'display:block;width:100%;height:100dvh;border:0;';
      frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\' http: https:; img-src http: https: data: blob:; font-src http: https: data:; media-src http: https: blob:; base-uri \'none\'; form-action \'none\'"><link id="mirror-styles" rel="stylesheet"><style id="mirror-root-styles"></style></head><body inert style="margin:0"><main id="mirror-content"></main></body></html>';
      frame.onload = () => {
        this.stopFrameScrollbars?.();
        if (frame.contentDocument) { this.stopFrameScrollbars = watchScrollbarActivity(frame.contentDocument); }
        this.applySnapshot();
      };
      let toolbar = this.createToolbar();
      document.getElementById(CONTENT_ROOT_ID)?.replaceChildren(frame, toolbar);
      this.frame = frame;
    }
    this.applySnapshot();
  }

  applySnapshot() {
    let frame = this.frame;
    let document = frame?.contentDocument;
    let root = document?.getElementById('mirror-content');
    let stylesheet = document?.getElementById('mirror-styles');
    let rootStyles = document?.getElementById('mirror-root-styles');
    if (!frame || !document || !root || !stylesheet || !rootStyles || !this.snapshot) { return; }
    let { html, stylesheetUrl } = this.snapshot;
    document.body.dataset.theme = this.snapshot.theme ?? 'system';
    frame.ownerDocument.body.dataset.theme = document.body.dataset.theme;
    let fragment = document.createElement('template');
    fragment.innerHTML = html;
    fragment.content.querySelectorAll('agui-data-toolbar').forEach((element) => element.remove());
    let x = frame.contentWindow?.scrollX || 0;
    let y = frame.contentWindow?.scrollY || 0;
    let scrolls = new Map(Array.from(this.markers.geometry?.targets || [], ([
      id,
      element,
    ]) => [
      id,
      {
        left: element.scrollLeft,
        top: element.scrollTop,
      },
    ]));
    root.replaceChildren(fragment.content);
    if (stylesheet.getAttribute('href') !== stylesheetUrl) { stylesheet.setAttribute('href', stylesheetUrl); }
    if (rootStyles.textContent !== (this.snapshot.rootStyles ?? '')) { rootStyles.textContent = this.snapshot.rootStyles ?? ''; }
    frame.contentWindow?.scrollTo(x, y);
    let targets = mirroredAnchors(root, this.snapshot);
    for (let [
      id,
      element,
    ] of targets) {
      let position = scrolls.get(id);
      if (position) { element.scrollLeft = position.left; element.scrollTop = position.top; }
    }
    this.markers.setView(root, targets, this.snapshot.revision, this.snapshot.sequence ?? 0);
  }

  createToolbar() {
    let content = document.createElement(COMPONENT_TAG);
    content.innerHTML = html`<agui-data-toolbar bind="state: ${PAGE_TEXT_CONTEXT}/dataToolbar"></agui-data-toolbar>`;
    return content;
  }

  disconnect() {
    this.markers.disconnect();
    clearTimeout(this.timer);
    clearInterval(this.refresh);
    this.refresh = undefined;
    this.timer = undefined;
    this.observer?.disconnect();
    this.observer = undefined;
    this.revision = -1;
    this.previous = '';
    let root = document.getElementById(CONTENT_ROOT_ID);
    root?.removeEventListener('input', this.schedule, true);
    root?.removeEventListener('change', this.schedule, true);
    root?.removeEventListener('toggle', this.schedule, true);
  }
}
