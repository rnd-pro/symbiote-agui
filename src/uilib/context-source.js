import { providerState } from './shared/initial-data.js';
import { sourceUrl, fetchTextSource } from './shared/source.js';

let limits = Object.freeze({
  inputBytes: 1024 * 1024,
  fetchTimeoutMs: 15_000,
});
let controls = Object.freeze([
  'src',
  'attribute-src',
  'state',
  'sourceLoading',
  'sourceError',
]);

export let CONTEXT_SOURCE_DEFAULTS = Object.freeze({
  src: undefined,
  sourceLoading: false,
  sourceError: '',
});

export class ContextSource {
  initialized = false;
  scheduled = false;
  bound = false;
  requestedUrl = '';
  /** @type {string[]} */
  inlineKeys = [];
  /** @type {AbortController | undefined} */
  controller;

  /** @param {import('./context-provider.js').ContextProvider} owner */
  constructor(owner) {
    this.owner = owner;
  }

  connect() {
    if (this.initialized) { return; }
    this.initialized = true;
    this.owner.sub('src', () => this.schedule());
    this.owner.sub('attribute-src', () => this.schedule());
  }

  cancel() {
    this.controller?.abort();
    this.controller = undefined;
    this.requestedUrl = '';
    if (this.owner.has('sourceLoading')) { this.owner.$.sourceLoading = false; }
  }

  /** @param {boolean} value */
  setBound(value) {
    this.bound = value;
    this.cancel();
    if (value && this.owner.has('sourceError')) { this.owner.$.sourceError = ''; }
    if (!value) { this.schedule(); }
  }

  schedule() {
    if (this.scheduled || !this.owner.isConnected) { return; }
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      if (this.owner.isConnected && !this.bound) { void this.load(); }
    });
  }

  async load() {
    let source = this.owner.$.src ?? this.owner.getAttribute('src') ?? '';
    let url = '';
    let error = '';
    try {
      if (typeof source !== 'string') { throw new Error('invalidSrc'); }
      if (source.trim()) { url = sourceUrl(source, document.baseURI); }
    } catch { error = 'invalidSrc'; }
    if (url && url === this.requestedUrl) { return; }
    this.cancel();
    this.owner.set$({
      sourceLoading: !!url,
      sourceError: error,
    });
    if (!url) { return; }
    let controller = new AbortController();
    this.controller = controller;
    this.requestedUrl = url;
    try {
      let result = await fetchTextSource(url, controller.signal, limits, window.location.href);
      if (this.controller !== controller || !this.owner.isConnected || this.bound) { return; }
      let data;
      try {
        data = providerState(JSON.parse(result.text));
        if (Object.keys(data).some((key) => controls.includes(key))) { throw new Error(); }
      } catch { throw new Error('invalidData'); }
      // Inline declarations include restored committed values and remain authoritative.
      let overrides = Object.fromEntries(this.inlineKeys.filter((key) => !controls.includes(key)).map((key) => [
        key,
        this.owner.$[key],
      ]));
      this.owner.applyState({
        ...data,
        ...overrides,
      }, true);
    } catch (failure) {
      if (this.controller !== controller || !this.owner.isConnected || this.bound) { return; }
      this.owner.$.sourceError = failure instanceof Error && [
        'inputTooLarge',
        'invalidData',
      ].includes(failure.message) ? failure.message : 'fetchFailed';
    }
    this.owner.$.sourceLoading = false;
  }
}
