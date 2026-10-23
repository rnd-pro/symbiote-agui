import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { emit } from '../../../events.js';
import { sameData } from '../../shared/data/equal.js';
import { TABLE_ATTRIBUTES } from './constants.js';
import { deriveTable, selectedIds, toggleFiltered } from './model.js';
import { presentTable } from './presentation.js';
import { tableTools } from './tools.js';
import { TABLE_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextTableId = 0;

export class Table extends UiComponent {
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.$.tableLabel,
  });
  domId = `agui-table-${++nextTableId}`;
  /** @type {import('../../../../../../types/uilib-table.js').UiTableModel | undefined} */
  model;
  /** @type {import('../../../../../../types/uilib-table.js').UiTableIssue | undefined} */
  issue;
  disposed = false;
  /** @type {string[] | null | undefined} */
  lastFilteredIds;
  init$ = {
    rows: [],
    columns: [],
    value: [],
    filteredIds: null,
    sort: null,
    texts: {},
    page: 1,
    ...Object.fromEntries(Object.keys(TABLE_ATTRIBUTES).map((key) => [
      key,
      undefined,
    ])),
    unavailable: true,
    modelValid: false,
    selectionEnabled: false,
    headings: [],
    bodyRows: [],
    tableLabel: '',
    busyText: 'false',
    surfaceHidden: true,
    statusMessage: '',
    resultsLabel: '',
    selectedLabel: '',
    pageLabel: '',
    paginationLabel: '',
    previousLabel: '',
    nextLabel: '',
    totalCount: 0,
    filteredCount: 0,
    selectedCount: 0,
    effectivePage: 1,
    pageCount: 1,
    paginationHidden: true,
    previousDisabled: true,
    nextDisabled: true,
    selectRow: (
      /** @type {string} */ id,
      /** @type {boolean} */ selected,
    ) => this.selectRow(id, selected),
    sortColumn: (/** @type {string} */ key) => this.sortColumn(key),
    selectFiltered: () => this.selectFiltered(),
    ...tableTools(this),
  };

  constructor() {
    super();
    this.templateProcessors.add(/** @type {typeof import('@symbiotejs/symbiote/core/slotProcessor.js').slotProcessor} */ (itemizeProcessor));
  }

  renderCallback() {
    for (let key of [
      'rows',
      'columns',
      'value',
      'filteredIds',
      'sort',
      'texts',
      'page',
      ...Object.keys(TABLE_ATTRIBUTES),
      ...Object.values(TABLE_ATTRIBUTES).map((attribute) => `attribute-${attribute}`),
    ]) { this.sub(key, () => this.refresh()); }
  }

  /** @returns {import('../../../../../../types/uilib-table.js').UiTableState} */
  stateInput() {
    /**
     * @param {keyof typeof TABLE_ATTRIBUTES} key
     * @param {unknown} fallback
     */
    let get = (key, fallback) => this.$[key] ?? this.getAttribute(TABLE_ATTRIBUTES[key]) ?? fallback;
    return /** @type {import('../../../../../../types/uilib-table.js').UiTableState} */ ({
      rows: this.$.rows,
      columns: this.$.columns,
      value: this.$.value,
      filteredIds: this.$.filteredIds,
      sort: this.$.sort,
      texts: this.$.texts,
      page: this.$.page,
      pageSize: Number(get('pageSize', 20)),
      idKey: get('idKey', 'id'),
      selection: get('selection', 'none'),
      locale: get('locale', document.documentElement.lang || navigator.language),
      label: String(get('label', '')),
      error: String(get('error', '')),
      loading: !!(this.$.loading ?? this.hasAttribute('loading')),
      disabled: !!(this.$.disabled ?? this.hasAttribute('disabled')),
      readonly: !!(this.$.readonly ?? this.hasAttribute('readonly')),
    });
  }

  refresh() {
    if (this.disposed) { return; }
    let state = this.stateInput();
    this.issue = undefined;
    try {
      this.model = deriveTable(state);
      if (!sameData(state.filteredIds, this.lastFilteredIds)) {
        this.lastFilteredIds = structuredClone(state.filteredIds);
        if (state.page !== 1) { this.$.page = 1; return; }
      }
    }
    catch (error) {
      this.model = undefined;
      let code = error instanceof Error ? error.message : '';
      this.issue = code === 'invalidRows' || code === 'invalidColumns' ? code : 'invalidState';
    }
    presentTable(this, state);
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
   * @param {import('../../../../../../types/uilib-table.js').UiTableProperty} property
   * @param {unknown} value
   */
  edit(property, value) {
    let model = this.requireModel();
    if (this.$.unavailable || this.disposed) { throw new Error(this.text('unavailable')); }
    if (property === 'value') {
      try { value = selectedIds(model, /** @type {string[]} */ (value)); }
      catch { throw new Error(this.text('invalidState')); }
    }
    let proposed = {
      ...model.state,
      [property]: value,
    };
    try { deriveTable(proposed); } catch { throw new Error(this.text('invalidState')); }
    if (property === 'page' && Number(value) > model.pageCount) { throw new Error(this.text('invalidState')); }
    let before = property === 'value' ? model.selected : property === 'page' ? model.page : model.state[property];
    let changed = property === 'value'
      ? !sameData([...(/** @type {string[]} */ (before))].sort(), [...(/** @type {string[]} */ (value))].sort())
      : !sameData(before, value);
    if (changed) {
      if (property === 'sort') { this.$.page = 1; }
      this.$[property] = structuredClone(value);
      let targetName = property === 'value' ? 'pub-to' : `${property}-pub-to`;
      let target = property === 'page' ? '' : this.getAttribute(targetName)?.trim();
      if (target) { this.$[target] = structuredClone(value); }
      let current = this.requireModel();
      /** @type {import('../../../../../../types/uilib-table.js').UiTableAction} */
      let action = {
        widgetId: this.id || this.localName,
        context: this.getAttribute('ctx')?.trim() || null,
        action: 'table-change',
        property,
        selectedCount: current.selected.length,
        filteredCount: current.filtered.length,
      };
      emit('agui:action', action);
    }
    let current = this.requireModel();
    return {
      changed,
      selectedCount: current.selected.length,
      filteredCount: current.filtered.length,
      page: current.page,
    };
  }

  /**
   * @param {string} id
   * @param {boolean} selected
   */
  selectRow(id, selected) {
    let model = this.requireModel();
    if (typeof selected !== 'boolean' || !model.state.rows.some((row) => row[model.state.idKey] === id)) { throw new Error(this.text('invalidState')); }
    let ids = new Set(model.state.selection === 'single' && selected ? [] : model.selected);
    if (selected) { ids.add(id); }
    else { ids.delete(id); }
    return this.edit('value', [...ids]);
  }

  selectFiltered() {
    return this.edit('value', toggleFiltered(this.requireModel()));
  }

  /** @param {string} key */
  sortColumn(key) {
    let current = this.requireModel().state.sort;
    return this.edit('sort', current?.key !== key ? {
      key,
      direction: 'ascending',
    } : current.direction === 'ascending' ? {
      key,
      direction: 'descending',
    } : null);
  }

  destroyCallback() {
    this.disposed = true;
  }
}

Table.bindAttributes(Object.fromEntries(Object.values(TABLE_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
Table.template = TABLE_TEMPLATE;
Table.rootStyles = styles;
