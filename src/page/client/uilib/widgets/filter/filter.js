import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { emit } from '../../../events.js';
import { sameData } from '../../shared/data/equal.js';
import { DATA_LIMITS } from '../../shared/data/constants.js';
import { deriveFilter } from './model.js';
import { presentFilter } from './presentation.js';
import { filterTools } from './tools.js';
import { FILTER_TEMPLATE } from './template.js';
import styles from './styles.js';

let attributes = Object.freeze({
  idKey: 'id-key',
  locale: 'locale',
  label: 'label',
  disabled: 'disabled',
  readonly: 'readonly',
  loading: 'loading',
  error: 'error',
});

export class Filter extends UiComponent {
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.stateInput().label,
  });
  /** @type {import('../../../../../../types/uilib-filter.js').UiFilterModel | undefined} */
  model;
  /** @type {import('../../../../../../types/uilib-filter.js').UiFilterIssue | undefined} */
  issue;
  disposed = false;
  init$ = {
    rows: [],
    fields: [],
    value: {},
    query: '',
    texts: {},
    ...Object.fromEntries(Object.keys(attributes).map((key) => [
      key,
      undefined,
    ])),
    unavailable: true,
    modelValid: false,
    resultIds: [],
    fieldItems: [],
    queryLabel: '',
    queryText: '',
    statusMessage: '',
    editField: (
      /** @type {string} */ key,
      /** @type {unknown} */ value,
    ) => this.editField(key, value),
    ...filterTools(this),
  };

  constructor() {
    super();
    this.templateProcessors.add(/** @type {typeof import('@symbiotejs/symbiote/core/slotProcessor.js').slotProcessor} */ (itemizeProcessor));
  }

  renderCallback() {
    this.ref.query.addEventListener('input', this.onQuery);
    for (let key of [
      'rows',
      'fields',
      'value',
      'query',
      'texts',
      ...Object.keys(attributes),
      ...Object.values(attributes).map((attribute) => `attribute-${attribute}`),
      'attribute-results-to',
    ]) { this.sub(key, () => this.refresh()); }
  }

  /** @returns {import('../../../../../../types/uilib-filter.js').UiFilterState} */
  stateInput() {
    /**
     * @param {keyof typeof attributes} key
     * @param {unknown} fallback
     */
    let get = (key, fallback) => this.$[key] ?? this.getAttribute(attributes[key]) ?? fallback;
    return /** @type {import('../../../../../../types/uilib-filter.js').UiFilterState} */ ({
      rows: this.$.rows,
      fields: this.$.fields,
      value: this.$.value,
      query: this.$.query,
      texts: this.$.texts,
      idKey: get('idKey', 'id'),
      locale: get('locale', document.documentElement.lang || navigator.language),
      label: String(get('label', '')),
      error: String(get('error', '')),
      loading: !!(this.$.loading ?? this.hasAttribute('loading')),
      disabled: !!(this.$.disabled ?? this.hasAttribute('disabled')),
      readonly: !!(this.$.readonly ?? this.hasAttribute('readonly')),
    });
  }

  refresh() {
    if (this.disposed || !this.isConnected) { return; }
    let state = this.stateInput();
    this.issue = undefined;
    try { this.model = deriveFilter(state); }
    catch (error) {
      this.model = undefined;
      let code = error instanceof Error ? error.message : '';
      this.issue = code === 'invalidRows' || code === 'invalidFields' ? code : 'invalidState';
    }
    presentFilter(this, state);
    // Computed results are a separate output; incoming updates never announce edits.
    let target = this.getAttribute('results-to')?.trim();
    if (target && !sameData(this.$[target], this.$.resultIds)) { this.$[target] = structuredClone(this.$.resultIds); }
    this.syncWebMCPTools();
  }

  /** @param {string} key */
  text(key) {
    return String((/** @type {import('../../../../../../types/uilib.js').UiTexts} */ (this.$.texts))?.[key] ?? '');
  }

  requireModel() {
    if (!this.model) { throw new Error(this.text(this.issue ?? 'invalidState')); }
    return this.model;
  }

  /**
   * @param {'value' | 'query'} property
   * @param {unknown} value
   */
  edit(property, value) {
    let model = this.requireModel();
    if (this.$.unavailable || this.disposed) { throw new Error(this.text('unavailable')); }
    try {
      deriveFilter({
        ...model.state,
        [property]: value,
      });
    } catch { throw new Error(this.text('invalidState')); }
    let changed = !sameData(model.state[property], value);
    if (changed) {
      this.$[property] = structuredClone(value);
      let target = this.getAttribute(property === 'value' ? 'pub-to' : 'query-pub-to')?.trim();
      if (target) { this.$[target] = structuredClone(value); }
      /** @type {import('../../../../../../types/uilib-filter.js').UiFilterAction} */
      let action = {
        widgetId: this.id || this.localName,
        context: this.getAttribute('ctx')?.trim() || null,
        action: 'filter-change',
        property,
        resultCount: this.requireModel().ids.length,
      };
      emit('agui:action', action);
    }
    return {
      changed,
      resultCount: this.requireModel().ids.length,
    };
  }

  /**
   * @param {string} key
   * @param {unknown} value
   */
  editField(key, value) {
    let filters = {
      ...this.requireModel().state.value,
    };
    if (value === '' || value && typeof value === 'object' && !Object.keys(value).length) { delete filters[key]; }
    else { filters[key] = /** @type {import('../../../../../../types/uilib-filter.js').UiFilterValue[string]} */ (value); }
    return this.edit('value', filters);
  }

  /**
   * @param {number} [offset]
   * @param {number} [limit]
   */
  readResult(offset = 0, limit = 20) {
    this.requireModel();
    if (!Number.isInteger(offset) || offset < 0 || offset > DATA_LIMITS.rows
      || !Number.isInteger(limit) || limit < 1 || limit > DATA_LIMITS.pageSize) { throw new Error(this.text('invalidState')); }
    let ids = /** @type {string[]} */ (this.$.resultIds);
    let items = ids.slice(offset, offset + limit);
    let result = () => ({
      total: ids.length,
      items,
      nextOffset: offset + items.length < ids.length ? offset + items.length : null,
    });
    while (new TextEncoder().encode(JSON.stringify(result())).byteLength > DATA_LIMITS.readBytes && items.length) { items.pop(); }
    return result();
  }

  onQuery = () => this.edit('query', /** @type {HTMLInputElement} */ (this.ref.query).value);

  destroyCallback() {
    this.disposed = true;
    this.ref.query.removeEventListener('input', this.onQuery);
  }
}

Filter.bindAttributes({
  ...Object.fromEntries(Object.values(attributes).map((attribute) => [
    attribute,
    `attribute-${attribute}`,
  ])),
  'results-to': 'attribute-results-to',
});
Filter.template = FILTER_TEMPLATE;
Filter.rootStyles = styles;
