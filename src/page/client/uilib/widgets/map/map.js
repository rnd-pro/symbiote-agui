import { UiComponent } from '../../shared/component.js';
import { emit } from '../../../events.js';
import { sameData } from '../../shared/data/equal.js';
import { MAP_ATTRIBUTES } from './constants.js';
import { deriveMap, selectedMapIds, validateView } from './model.js';
import { presentMap } from './presentation.js';
import { mapTools } from './tools.js';
import { loadMapRuntime } from './loader.js';
import { MAP_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextMapId = 0;

export class AguiMap extends UiComponent {
  domId = `agui-map-${++nextMapId}`;
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.$.mapLabel,
  });
  /** @type {import('../../../../../../types/uilib-map.js').UiMapModel | undefined} */
  model;
  /** @type {'invalidRows' | 'invalidState' | 'invalidTiles' | undefined} */
  issue;
  /** @type {'loadFailed' | 'renderFailed' | undefined} */
  runtimeError;
  /** @type {typeof import('./runtime/index.js') | undefined} */
  runtime;
  /** @type {import('../../../../../../types/uilib-map.js').UiMapRenderer | undefined} */
  renderer;
  /** @type {ResizeObserver | undefined} */
  resizeObserver;
  disposed = false;
  paintFrame = 0;
  tileError = false;
  init$ = {
    rows: [],
    value: [],
    view: {
      center: [
        0,
        0,
      ],
      zoom: 2,
    },
    tiles: null,
    texts: {},
    ...Object.fromEntries(Object.keys(MAP_ATTRIBUTES).map((key) => [
      key,
      undefined,
    ])),
    runtimeReady: false,
    rendererReady: false,
    viewReady: false,
    unavailable: true,
    selectionUnavailable: true,
    fitUnavailable: true,
    modelValid: false,
    mapHidden: true,
    statusMessage: '',
    statusState: 'ready',
    mapLabel: '',
    mapDescription: '',
    attribution: '',
    attributionUrl: '',
    skippedCount: 0,
    skippedLabel: '',
    fitLabel: '',
    zoomInLabel: '',
    zoomOutLabel: '',
    dataLabel: '',
    dataTableId: '',
    dataSelectionMode: 'none',
    dataDisabled: true,
    dataRows: [],
    dataColumns: [],
    effectiveSelected: [],
    selectIds: (/** @type {string[]} */ ids) => this.setSelection(ids),
    onFit: () => this.fitRecords(),
    onZoomIn: () => this.zoom(1),
    onZoomOut: () => this.zoom(-1),
    ...mapTools(this),
  };

  renderCallback() {
    for (let key of [
      'rows',
      'value',
      'view',
      'tiles',
      'texts',
      ...Object.keys(MAP_ATTRIBUTES),
      ...Object.values(MAP_ATTRIBUTES).map((attribute) => `attribute-${attribute}`),
    ]) { this.sub(key, () => this.refresh()); }
    this.resizeObserver = new ResizeObserver(() => this.schedulePaint());
    this.resizeObserver.observe(this.ref.canvas);
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
      let runtime = await loadMapRuntime();
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

  /** @returns {import('../../../../../../types/uilib-map.js').UiMapState} */
  stateInput() {
    /**
     * @param {keyof typeof MAP_ATTRIBUTES} key
     * @param {unknown} fallback
     */
    let get = (key, fallback) => this.$[key] ?? this.getAttribute(MAP_ATTRIBUTES[key]) ?? fallback;
    return /** @type {import('../../../../../../types/uilib-map.js').UiMapState} */ ({
      rows: this.$.rows,
      value: this.$.value,
      view: this.$.view,
      tiles: this.$.tiles,
      texts: this.$.texts,
      selection: get('selection', 'multiple'),
      idKey: get('idKey', 'id'),
      latitudeKey: get('latitudeKey', 'latitude'),
      longitudeKey: get('longitudeKey', 'longitude'),
      labelKey: get('labelKey', 'label'),
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
    try { this.model = deriveMap(this.stateInput()); }
    catch (error) {
      this.model = undefined;
      let code = error instanceof Error ? error.message : '';
      this.issue = code === 'invalidRows' || code === 'invalidTiles' ? code : 'invalidState';
    }
    presentMap(this);
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
    if (this.$.mapHidden || !this.model) {
      this.renderer?.dispose();
      this.renderer = undefined;
      this.$.rendererReady = false;
      presentMap(this);
      return;
    }
    let canvas = /** @type {HTMLElement} */ (this.ref.canvas);
    if (!canvas.clientWidth || !canvas.clientHeight) { return; }
    try {
      this.renderer ??= this.runtime.createMapRenderer(canvas, {
        select: (id) => { if (!this.disposed && this.isConnected && !this.$.selectionUnavailable) { this.selectPoint(id); } },
        view: (view) => { if (!this.disposed && this.isConnected && !this.$.unavailable) { this.setView(view); } },
        tileError: (failed) => {
          if (this.disposed) { return; }
          this.tileError = failed;
          presentMap(this);
        },
      });
      this.$.rendererReady = true;
      presentMap(this);
      this.renderer.render(this.model, !!this.$.unavailable);
    } catch {
      this.renderer?.dispose();
      this.renderer = undefined;
      this.$.rendererReady = false;
      this.runtimeError = 'renderFailed';
      presentMap(this);
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

  /** @param {boolean} [selection] */
  assertAvailable(selection = false) {
    if (this.disposed || !this.isConnected || this.$.unavailable || selection && this.$.selectionUnavailable) { throw new Error(this.text('unavailable')); }
  }

  /** @param {'value' | 'view'} property
   * @param {string[] | import('../../../../../../types/uilib-map.js').UiMapView} value
   */
  publish(property, value) {
    this.$[property] = structuredClone(value);
    let target = this.getAttribute(property === 'value' ? 'pub-to' : 'view-pub-to')?.trim();
    if (target) { this.$[target] = structuredClone(value); }
    emit('agui:action', {
      widgetId: this.id || this.localName,
      context: this.getAttribute('ctx')?.trim() || null,
      action: property === 'value' ? 'map-selection-change' : 'map-view-change',
      selectedCount: this.requireModel().selected.length,
      totalCount: this.requireModel().points.length,
    });
  }

  /** @param {string[]} ids */
  setSelection(ids) {
    this.assertAvailable(true);
    let model = this.requireModel();
    try { ids = selectedMapIds(model, ids); } catch { throw new Error(this.text('invalidState')); }
    let changed = !sameData(model.selected.slice().sort(), ids.slice().sort());
    if (changed) { this.publish('value', ids); }
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

  /** @param {import('../../../../../../types/uilib-map.js').UiMapView} view */
  setView(view) {
    this.assertAvailable();
    try { validateView(view); } catch { throw new Error(this.text('invalidState')); }
    let previous = this.requireModel().state.view;
    // Projection/wrapping can introduce sub-centimeter floating-point noise.
    let changed = previous.zoom !== view.zoom || view.center.some((coordinate, index) => Math.abs(coordinate - previous.center[index]) > 1e-7);
    if (changed) { this.publish('view', view); }
    return {
      changed,
      view: structuredClone(this.requireModel().state.view),
    };
  }

  fitRecords() {
    this.assertAvailable();
    this.paint();
    let view = this.renderer?.fitView();
    if (!view) { throw new Error(this.text('unavailable')); }
    return this.setView(view);
  }

  /** @param {number} amount */
  zoom(amount) {
    this.assertAvailable();
    this.paint();
    this.renderer?.zoom(amount);
  }

  destroyCallback() {
    this.disposed = true;
    cancelAnimationFrame(this.paintFrame);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.renderer = undefined;
  }
}

AguiMap.bindAttributes(Object.fromEntries(Object.values(MAP_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
AguiMap.template = MAP_TEMPLATE;
AguiMap.rootStyles = styles;
