import { UiComponent } from '../../shared/component.js';
import { emit } from '../../../events.js';
import { sameData } from '../../shared/data/equal.js';
import { CHART_ATTRIBUTES } from './constants.js';
import { deriveChart, selectedIds } from './model.js';
import { presentChart } from './presentation.js';
import { chartTools } from './tools.js';
import { loadChartRuntime } from './loader.js';
import { chartTheme, watchChart } from './theme.js';
import { CHART_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextChartId = 0;

export class Chart extends UiComponent {
  domId = `agui-chart-${++nextChartId}`;
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.$.chartLabel,
  });
  /** @type {import('../../../../../../types/uilib-chart.js').UiChartModel | undefined} */
  model;
  /** @type {import('../../../../../../types/uilib-chart.js').UiChartIssue | undefined} */
  issue;
  /** @type {'loadFailed' | 'renderFailed' | undefined} */
  runtimeError;
  /** @type {typeof import('./runtime/index.js') | undefined} */
  runtime;
  /** @type {import('../../../../../../types/uilib-chart.js').UiChartRenderer | undefined} */
  renderer;
  /** @type {(() => void) | undefined} */
  stopWatching;
  disposed = false;
  paintFrame = 0;
  init$ = {
    rows: [],
    series: [],
    value: [],
    texts: {},
    ...Object.fromEntries(Object.keys(CHART_ATTRIBUTES).map((key) => [
      key,
      undefined,
    ])),
    runtimeReady: false,
    unavailable: true,
    modelValid: false,
    plotHidden: true,
    statusMessage: '',
    statusState: 'ready',
    chartLabel: '',
    chartDescription: '',
    dataLabel: '',
    dataTableId: '',
    dataSelectionMode: 'none',
    dataLoading: false,
    dataError: '',
    dataDisabled: true,
    dataRows: [],
    dataColumns: [],
    effectiveSelected: [],
    selectIds: (/** @type {string[]} */ ids) => this.setSelection(ids),
    ...chartTools(this),
  };

  renderCallback() {
    for (let key of [
      'rows',
      'series',
      'value',
      'texts',
      ...Object.keys(CHART_ATTRIBUTES),
      ...Object.values(CHART_ATTRIBUTES).map((attribute) => `attribute-${attribute}`),
    ]) { this.sub(key, () => this.refresh()); }
    this.stopWatching = watchChart(this);
    this.loadRuntime();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.disposed || !this.runtime && !this.runtimeError) { return; }
    this.$.runtimeReady = !!this.runtime;
    this.refresh();
  }

  async loadRuntime() {
    try {
      let runtime = await loadChartRuntime();
      if (this.disposed) { return; }
      this.runtime = runtime;
      if (!this.isConnected) { return; }
      this.$.runtimeReady = true;
    } catch {
      if (this.disposed) { return; }
      this.runtimeError = 'loadFailed';
    }
    this.refresh();
  }

  /** @returns {import('../../../../../../types/uilib-chart.js').UiChartState} */
  stateInput() {
    /**
     * @param {keyof typeof CHART_ATTRIBUTES} key
     * @param {unknown} fallback
     */
    let get = (key, fallback) => this.$[key] ?? this.getAttribute(CHART_ATTRIBUTES[key]) ?? fallback;
    return /** @type {import('../../../../../../types/uilib-chart.js').UiChartState} */ ({
      rows: this.$.rows,
      series: this.$.series,
      value: this.$.value,
      texts: this.$.texts,
      type: get('type', 'line'),
      selection: get('selection', 'none'),
      idKey: get('idKey', 'id'),
      xKey: get('xKey', 'label'),
      xLabel: get('xLabel', ''),
      xType: get('xType', 'text'),
      locale: get('locale', document.documentElement.lang || navigator.language),
      label: String(get('label', '')),
      description: String(get('description', '')),
      error: String(get('error', '')),
      loading: !!(this.$.loading ?? this.hasAttribute('loading')),
      disabled: !!(this.$.disabled ?? this.hasAttribute('disabled')),
      readonly: !!(this.$.readonly ?? this.hasAttribute('readonly')),
    });
  }

  refresh() {
    if (this.disposed || !this.isConnected) { return; }
    this.issue = undefined;
    try { this.model = deriveChart(this.stateInput()); }
    catch (error) {
      this.model = undefined;
      let code = error instanceof Error ? error.message : '';
      this.issue = code === 'invalidRows' || code === 'invalidSeries' ? code : 'invalidState';
    }
    presentChart(this);
    this.syncWebMCPTools();
    this.schedulePaint();
  }

  schedulePaint() {
    if (this.paintFrame || this.disposed || !this.isConnected) { return; }
    this.paintFrame = requestAnimationFrame(() => {
      this.paintFrame = 0;
      this.paint();
    });
  }

  paint() {
    if (this.disposed || !this.isConnected || !this.runtime || this.runtimeError) { return; }
    let model = this.model;
    if (this.$.plotHidden || !model) {
      this.renderer?.dispose();
      this.renderer = undefined;
      return;
    }
    let plot = /** @type {HTMLElement} */ (this.ref.plot);
    if (!plot.clientWidth || !plot.clientHeight) { return; }
    try {
      this.renderer ??= this.runtime.createChartRenderer(plot, (id) => {
        if (!this.$.unavailable) { this.selectPoint(id); }
      });
      this.renderer.render(model, chartTheme(this));
    } catch {
      this.renderer?.dispose();
      this.renderer = undefined;
      this.runtimeError = 'renderFailed';
      presentChart(this);
      this.syncWebMCPTools();
    }
  }

  /** @param {string} key */
  text(key) {
    return String((/** @type {import('../../../../../../types/uilib.js').UiTexts} */ (this.$.texts))?.[key] ?? '');
  }

  requireModel() {
    if (!this.model) { throw new Error(this.text(this.issue ?? 'invalidState')); }
    return this.model;
  }

  /** @param {string[]} ids */
  setSelection(ids) {
    let model = this.requireModel();
    if (this.disposed || !this.isConnected || this.$.unavailable) { throw new Error(this.text('unavailable')); }
    try { ids = selectedIds(model, ids); } catch { throw new Error(this.text('invalidState')); }
    let changed = !sameData(model.selected.slice().sort(), ids.slice().sort());
    if (changed) {
      this.$.value = ids;
      let target = this.getAttribute('pub-to')?.trim();
      if (target) { this.$[target] = ids.slice(); }
      /** @type {import('../../../../../../types/uilib-chart.js').UiChartAction} */
      let action = {
        widgetId: this.id || this.localName,
        context: this.getAttribute('ctx')?.trim() || null,
        action: 'chart-change',
        selectedCount: ids.length,
        totalCount: model.points.length,
      };
      emit('agui:action', action);
    }
    return {
      changed,
      selectedCount: this.requireModel().selected.length,
      totalCount: model.points.length,
    };
  }

  /** @param {string} id */
  selectPoint(id) {
    let model = this.requireModel();
    let ids = new Set(model.state.selection === 'single' && !model.selected.includes(id) ? [] : model.selected);
    if (ids.has(id)) { ids.delete(id); } else { ids.add(id); }
    return this.setSelection(Array.from(ids));
  }

  destroyCallback() {
    this.disposed = true;
    cancelAnimationFrame(this.paintFrame);
    this.stopWatching?.();
    this.renderer?.dispose();
    this.renderer = undefined;
  }
}

Chart.bindAttributes(Object.fromEntries(Object.values(CHART_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
Chart.template = CHART_TEMPLATE;
Chart.rootStyles = styles;
