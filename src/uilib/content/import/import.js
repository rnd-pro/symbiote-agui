import { css } from '@symbiotejs/symbiote';
import { UiComponent } from '../../shared/component.js';
import { sourceUrl, fetchTextSource } from '../../shared/source.js';

let limits = Object.freeze({
  inputBytes: 1024 * 1024,
  fetchTimeoutMs: 15_000,
});

export class HtmlImport extends UiComponent {
  processInnerHtml = true;
  initialized = false;
  scheduled = false;
  requestedUrl = '';
  /** @type {AbortController | undefined} */
  controller;
  /** @type {Set<{ remove(): void }>} */
  contentSubs = new Set();
  init$ = {
    src: undefined,
    loading: false,
    error: '',
  };

  renderCallback() {
    if (this.initialized) { return; }
    this.contentSubs = new Set(this.allSubs);
    this.initialized = true;
    this.sub('src', () => this.schedule());
    this.sub('attribute-src', () => this.schedule());
  }

  connectedCallback() {
    super.connectedCallback();
    this.schedule();
  }

  disconnectedCallback() {
    this.controller?.abort();
    this.controller = undefined;
    this.requestedUrl = '';
    super.disconnectedCallback();
  }

  schedule() {
    if (this.scheduled || !this.isConnected) { return; }
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      if (this.isConnected) { void this.load(); }
    });
  }

  clearContent() {
    // Native render adds subscriptions; remove only the replaced chunk's bindings.
    for (let subscription of this.contentSubs) {
      subscription.remove();
      this.allSubs.delete(subscription);
    }
    this.contentSubs.clear();
    for (let key of Object.keys(this.ref)) { delete this.ref[key]; }
    this.replaceChildren();
    super.render();
  }

  async load() {
    let source = this.$.src ?? this.getAttribute('src') ?? '';
    let url = '';
    let error = '';
    try {
      if (typeof source !== 'string') { throw new Error('invalidSrc'); }
      if (source.trim()) { url = sourceUrl(source, document.baseURI); }
    } catch { error = 'invalidSrc'; }
    if (url && url === this.requestedUrl) { return; }
    this.controller?.abort();
    let controller = new AbortController();
    this.controller = controller;
    this.requestedUrl = url;
    this.clearContent();
    this.set$({
      loading: !!url,
      error,
    });
    this.setAttribute('aria-busy', String(!!url));
    if (!url) { return; }
    try {
      let source = await fetchTextSource(url, controller.signal, limits, window.location.href);
      if (this.controller !== controller || !this.isConnected) { return; }
      let subscriptions = new Set(this.allSubs);
      try {
        this.innerHTML = source.text;
        // Process the host's own DOM so nested providers retain their native scope.
        if (this.processInnerHtml) { super.render(); }
      } finally {
        this.contentSubs = new Set([...this.allSubs].filter((subscription) => !subscriptions.has(subscription)));
      }
    } catch (failure) {
      if (this.controller !== controller || !this.isConnected) { return; }
      this.$.error = failure instanceof Error && failure.message === 'inputTooLarge' ? 'inputTooLarge' : 'fetchFailed';
    }
    this.$.loading = false;
    this.setAttribute('aria-busy', 'false');
  }
}

HtmlImport.bindAttributes({
  src: 'attribute-src',
});
HtmlImport.rootStyles = css`
  @layer components {
    agui-import {
      display: contents;
    }
  }
`;
