import { UiComponent } from '../../shared/component.js';
import { MARKDOWN_ATTRIBUTES, MARKDOWN_LIMITS } from './constants.js';
import { loadMarkdownRuntime } from './loader.js';
import { markdownSourceUrl, fetchMarkdownSource } from './source.js';
import { MARKDOWN_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextDocumentId = 0;

export class Markdown extends UiComponent {
  headingPrefix = `agui-md-${++nextDocumentId}`;
  /** @type {typeof import('./runtime/index.js') | undefined} */
  runtime;
  loadFailed = false;
  disposed = false;
  revision = 0;
  scheduled = false;
  sourceUrl = '';
  sourceBaseUrl = '';
  sourceValue = '';
  sourceIssue = '';
  sourceLoading = false;
  /** @type {AbortController | undefined} */
  sourceController;
  init$ = {
    value: '',
    extensions: true,
    texts: {},
    label: undefined,
    src: undefined,
    loading: undefined,
    error: undefined,
    statusMessage: '',
    statusState: 'ready',
    documentLabel: '',
    busy: false,
    contentHidden: true,
  };

  renderCallback() {
    for (let key of [
      'value',
      'extensions',
      'texts',
      ...Object.keys(MARKDOWN_ATTRIBUTES),
      ...Object.values(MARKDOWN_ATTRIBUTES).map((attribute) => `attribute-${attribute}`),
    ]) { this.sub(key, () => this.refresh()); }
    this.loadRuntime();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.runtime || this.loadFailed) { this.refresh(); }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopSource();
  }

  async loadRuntime() {
    try {
      let runtime = await loadMarkdownRuntime();
      if (this.disposed) { return; }
      this.runtime = runtime;
    } catch {
      if (this.disposed) { return; }
      this.loadFailed = true;
    }
    this.refresh();
  }

  /** @param {string} key */
  text(key) {
    return String((/** @type {import('../../../../../../types/uilib.js').UiTexts} */ (this.$.texts))?.[key] ?? '');
  }

  refresh() {
    this.revision += 1;
    if (this.disposed || !this.isConnected || this.scheduled) { return; }
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      if (!this.disposed && this.isConnected) { this.renderDocument(this.revision); }
    });
  }

  stopSource() {
    this.sourceController?.abort();
    this.sourceController = undefined;
    this.sourceUrl = '';
    this.sourceBaseUrl = '';
    this.sourceValue = '';
    this.sourceIssue = '';
    this.sourceLoading = false;
  }

  /** @param {string} url */
  async loadSource(url) {
    this.stopSource();
    this.sourceUrl = url;
    this.sourceLoading = true;
    let controller = new AbortController();
    this.sourceController = controller;
    try {
      let value = await fetchMarkdownSource(url, controller.signal, window.location.href);
      if (this.disposed || this.sourceController !== controller) { return; }
      this.sourceValue = value.text;
      this.sourceBaseUrl = value.url;
    } catch (error) {
      if (this.disposed || this.sourceController !== controller) { return; }
      this.sourceIssue = error instanceof Error && error.message === 'inputTooLarge' ? 'inputTooLarge' : 'fetchFailed';
    }
    this.sourceLoading = false;
    this.refresh();
  }

  readSource() {
    let src = this.$.src ?? this.getAttribute('src') ?? '';
    if (typeof src !== 'string') {
      this.stopSource();
      return {
        value: '',
        issue: 'invalidSrc',
        loading: false,
      };
    }
    if (!src.trim()) {
      this.stopSource();
      return {
        value: this.$.value,
        issue: '',
        loading: false,
      };
    }
    let url;
    try { url = markdownSourceUrl(src, document.baseURI); }
    catch {
      this.stopSource();
      return {
        value: '',
        issue: 'invalidSrc',
        loading: false,
      };
    }
    if (url !== this.sourceUrl) { this.loadSource(url); }
    return {
      value: this.sourceValue,
      issue: this.sourceIssue,
      loading: this.sourceLoading,
    };
  }

  /** @param {number} revision */
  async renderDocument(revision) {
    let remote = this.readSource();
    let source = remote.value;
    let error = String(this.$.error ?? this.getAttribute('error') ?? '');
    let loading = remote.loading || !!(this.$.loading ?? this.hasAttribute('loading'));
    let issue = remote.issue || (typeof source !== 'string' || typeof this.$.extensions !== 'boolean' ? 'invalidValue'
      : source.length > MARKDOWN_LIMITS.inputBytes || new TextEncoder().encode(source).byteLength > MARKDOWN_LIMITS.inputBytes ? 'inputTooLarge'
      : !source.trim() ? 'empty' : this.loadFailed ? 'loadFailed' : '');
    let busy = !error && (loading || !issue && !this.runtime);
    this.ref.body.replaceChildren();
    this.set$({
      documentLabel: String(this.$.label ?? this.getAttribute('label') ?? ''),
      contentHidden: true,
      busy,
      statusState: error ? 'error' : loading ? 'loading' : issue ? issue === 'empty' ? 'empty' : 'error' : busy ? 'loading' : 'ready',
      statusMessage: error || this.text(loading ? 'loading' : issue || (busy ? 'loading' : '')),
    });
    if (issue || error || loading || !this.runtime) { return; }
    this.set$({
      busy: true,
      statusState: 'loading',
      statusMessage: this.text('loading'),
    });
    try {
      let fragment = await this.runtime.renderMarkdown(String(source), this.headingPrefix, this.sourceBaseUrl || document.baseURI, this.$.extensions === true);
      if (this.disposed || !this.isConnected || revision !== this.revision) { return; }
      // The runtime prepares safe HTML and trusted component instances before
      // connection; document text does not enter the host's RAT pipeline.
      this.ref.body.replaceChildren(fragment);
      this.set$({
        busy: false,
        contentHidden: false,
        statusState: 'ready',
        statusMessage: '',
      });
    } catch (error) {
      if (this.disposed || !this.isConnected || revision !== this.revision) { return; }
      let issue = error instanceof Error && [
        'loadFailed',
        'outputTooLarge',
      ].includes(error.message) ? error.message : 'renderFailed';
      this.set$({
        busy: false,
        statusMessage: this.text(issue),
        statusState: 'error',
      });
    }
  }

  destroyCallback() {
    this.stopSource();
    this.disposed = true;
    this.revision += 1;
  }
}

Markdown.bindAttributes(Object.fromEntries(Object.values(MARKDOWN_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
Markdown.template = MARKDOWN_TEMPLATE;
Markdown.rootStyles = styles;
