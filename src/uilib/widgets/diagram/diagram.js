import { UiComponent } from '../../shared/component.js';
import { DIAGRAM_ATTRIBUTES } from './constants.js';
import { diagramSourceIssue } from './source.js';
import { loadDiagramRuntime } from './loader.js';
import { DIAGRAM_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextDiagramId = 0;

export class Diagram extends UiComponent {
  svgPrefix = `agui-diagram-${++nextDiagramId}-`;
  /** @type {typeof import('./runtime/index.js') | undefined} */
  runtime;
  disposed = false;
  loadFailed = false;
  scheduled = false;
  revision = 0;
  init$ = {
    value: '',
    label: undefined,
    description: undefined,
    loading: undefined,
    error: undefined,
    texts: {},
    diagramLabel: '',
    diagramDescription: '',
    statusState: 'ready',
    statusMessage: '',
    busyText: 'false',
    plotHidden: true,
    sourceLabel: '',
    sourceText: '',
    hasSource: false,
  };

  renderCallback() {
    for (let key of [
      'value',
      'texts',
      ...DIAGRAM_ATTRIBUTES,
      ...DIAGRAM_ATTRIBUTES.map((key) => `attribute-${key}`),
    ]) { this.sub(key, () => this.refresh()); }
    this.loadRuntime();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.runtime || this.loadFailed) { this.refresh(); }
  }

  disconnectedCallback() {
    this.revision += 1;
    super.disconnectedCallback();
  }

  async loadRuntime() {
    try {
      let runtime = await loadDiagramRuntime();
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
    let texts = /** @type {import('../../../../types/uilib.js').UiTexts} */ (this.$.texts);
    return String(texts?.[key] ?? '');
  }

  refresh() {
    this.revision += 1;
    if (this.disposed || !this.isConnected || this.scheduled) { return; }
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      if (!this.disposed && this.isConnected) { void this.draw(this.revision); }
    });
  }

  /** @param {number} revision */
  async draw(revision) {
    let source = this.$.value;
    let issue = diagramSourceIssue(source);
    let error = String(this.$.error ?? this.getAttribute('error') ?? '');
    let loading = !!(this.$.loading ?? this.hasAttribute('loading'));
    let busy = !error && (loading || !issue && !this.runtime && !this.loadFailed);
    let failure = issue || (this.loadFailed ? 'loadFailed' : '');
    this.ref.plot.replaceChildren();
    this.set$({
      diagramLabel: String(this.$.label ?? this.getAttribute('label') ?? ''),
      diagramDescription: String(this.$.description ?? this.getAttribute('description') ?? ''),
      sourceLabel: this.text('source'),
      sourceText: !issue || issue === 'empty' ? String(source) : '',
      hasSource: !issue,
      plotHidden: true,
      busyText: String(busy),
      statusState: error ? 'error' : busy ? 'loading' : failure ? failure === 'empty' ? 'empty' : 'error' : 'ready',
      statusMessage: error || this.text(busy ? 'loading' : failure),
    });
    if (issue || error || loading || !this.runtime) { return; }
    try {
      let fragment = await this.runtime.renderDiagram(String(source), this.svgPrefix);
      if (this.disposed || !this.isConnected || revision !== this.revision) { return; }
      this.ref.plot.replaceChildren(fragment);
      this.set$({
        plotHidden: false,
        busyText: 'false',
        statusState: 'ready',
        statusMessage: '',
      });
    } catch (error) {
      if (this.disposed || !this.isConnected || revision !== this.revision) { return; }
      let issue = error instanceof Error ? error.message : '';
      this.set$({
        busyText: 'false',
        statusState: 'error',
        statusMessage: this.text([
          'invalidSource',
          'unsupported',
          'inputTooLarge',
          'outputTooLarge',
          'limitExceeded',
        ].includes(issue) ? issue : 'renderFailed'),
      });
    }
  }

  destroyCallback() {
    this.disposed = true;
    this.revision += 1;
  }
}

Diagram.bindAttributes(Object.fromEntries(DIAGRAM_ATTRIBUTES.map((key) => [
  key,
  `attribute-${key}`,
])));
Diagram.template = DIAGRAM_TEMPLATE;
Diagram.rootStyles = styles;
