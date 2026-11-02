import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { sameData } from '../../shared/data/equal.js';
import { validateSelection } from '../../shared/data/selection.js';
import { emit } from '../../shared/events.js';
import { LIST_ATTRIBUTES } from './constants.js';
import { deriveList } from './model.js';
import { listTools } from './tools.js';
import { LIST_TEMPLATE } from './template.js';
import styles from './styles.js';

let nextListId = 0;

export class List extends UiComponent {
  domId = `agui-list-${++nextListId}`;
  /** @type {HTMLTemplateElement | undefined} */
  inlineTemplate;
  /** @type {import('../../../../types/uilib-list.js').UiListModel | undefined} */
  model;
  issue = '';
  disposed = false;
  previousTemplate = '';
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.$.listLabel,
  });
  init$ = {
    rows: [],
    value: [],
    filteredIds: null,
    texts: {},
    ...Object.fromEntries(Object.keys(LIST_ATTRIBUTES).map((key) => [
      key,
      undefined,
    ])),
    items: [],
    listClass: 'agui-list-items',
    listLabel: '',
    busyText: 'false',
    surfaceHidden: false,
    statusState: 'ready',
    statusMessage: '',
    unavailable: true,
    selectionEnabled: false,
    selectItem: (
      /** @type {string} */ id,
      /** @type {boolean} */ selected,
    ) => this.selectItem(id, selected),
    ...listTools(this),
  };

  constructor() {
    super();
    this.templateProcessors.add(/** @type {typeof import('@symbiotejs/symbiote/core/slotProcessor.js').slotProcessor} */ (itemizeProcessor));
  }

  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    this.inlineTemplate = /** @type {HTMLTemplateElement | undefined} */ ([...this.children].find((child) => child instanceof HTMLTemplateElement));
    if (this.inlineTemplate) { this.inlineTemplate.id ||= `${this.domId}-template`; }
    super.render(template, shadow);
  }

  renderCallback() {
    for (let key of [
      'rows',
      'value',
      'filteredIds',
      'texts',
      ...Object.keys(LIST_ATTRIBUTES),
      ...Object.values(LIST_ATTRIBUTES).map((attribute) => `attribute-${attribute}`),
    ]) { this.sub(key, () => this.refresh()); }
  }

  /** @returns {import('../../../../types/uilib-list.js').UiListState} */
  stateInput() {
    /**
     * @param {keyof typeof LIST_ATTRIBUTES} key
     * @param {unknown} fallback
     */
    let get = (key, fallback) => this.$[key] ?? this.getAttribute(LIST_ATTRIBUTES[key]) ?? fallback;
    return /** @type {import('../../../../types/uilib-list.js').UiListState} */ ({
      rows: this.$.rows,
      value: this.$.value,
      filteredIds: this.$.filteredIds,
      texts: this.$.texts,
      idKey: get('idKey', 'id'),
      selection: get('selection', 'none'),
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
    let selector = String(this.$.itemTemplate ?? this.getAttribute('item-template') ?? (this.inlineTemplate ? `#${CSS.escape(this.inlineTemplate.id)}` : ''));
    this.issue = '';
    try {
      let root = /** @type {Document | ShadowRoot} */ (this.getRootNode());
      if (!selector || !((root.querySelector(selector) || document.querySelector(selector)) instanceof HTMLTemplateElement)) { throw new Error('invalidState'); }
      this.model = deriveList(state);
    } catch (error) {
      this.model = undefined;
      this.issue = error instanceof Error && error.message === 'invalidRows' ? 'invalidRows' : 'invalidState';
    }
    if (selector !== this.previousTemplate) {
      this.$.items = [];
      this.previousTemplate = selector;
    }
    let model = this.model;
    let unavailable = !model || state.disabled || state.readonly || state.loading || !!state.error;
    let selected = new Set(model?.selected);
    let selectable = state.selection !== 'none';
    this.set$({
      unavailable,
      selectionEnabled: selectable && !!model,
      listLabel: state.label,
      listClass: `agui-list-items ${this.$.itemsClass ?? this.getAttribute('items-class') ?? ''}`.trim(),
      busyText: String(state.loading),
      surfaceHidden: !model || state.loading || !!state.error,
      statusState: state.loading ? 'loading' : state.error || this.issue ? 'error' : !model?.filtered.length ? 'empty' : 'ready',
      statusMessage: state.loading ? this.text('loading') : state.error || (this.issue ? this.text(this.issue) : !model?.filtered.length ? this.text('empty') : ''),
      items: (state.loading || state.error ? [] : model?.filtered ?? []).map((record) => {
        let id = String(record[state.idKey]);
        return {
          id,
          record,
          selected: selected.has(id),
          selectionEnabled: selectable,
          selectable: selectable && !unavailable,
          unavailable: unavailable || !selectable,
          selectionType: state.selection === 'single' ? 'radio' : 'checkbox',
          groupName: this.domId,
          selectLabel: `${this.text('selectItem')} ${id}`.trim(),
          templateSelector: selector,
          tabIndex: selectable && !unavailable ? 0 : -1,
        };
      }),
    });
    this.syncWebMCPTools();
  }

  /** @param {string} key */
  text(key) {
    return String((/** @type {import('../../../../types/uilib.js').UiTexts} */ (this.$.texts))?.[key] ?? '');
  }

  requireModel() {
    if (!this.model) { throw new Error(this.text(this.issue || 'invalidState')); }
    return this.model;
  }

  /** @param {string[]} ids */
  edit(ids) {
    let model = this.requireModel();
    if (this.$.unavailable || this.disposed) { throw new Error(this.text('unavailable')); }
    try { ids = validateSelection(model.state, ids); }
    catch { throw new Error(this.text('invalidState')); }
    let changed = !sameData([...model.selected].sort(), [...ids].sort());
    if (changed) {
      this.$.value = [...ids];
      let target = this.getAttribute('pub-to')?.trim();
      if (target) { this.$[target] = [...ids]; }
      emit('agui:action', {
        widgetId: this.id || this.localName,
        context: this.getAttribute('ctx')?.trim() || null,
        action: 'list-change',
        property: 'value',
        selectedCount: ids.length,
        filteredCount: this.requireModel().filtered.length,
      });
    }
    return {
      changed,
      selectedCount: this.requireModel().selected.length,
      filteredCount: this.requireModel().filtered.length,
    };
  }

  /**
   * @param {string} id
   * @param {boolean} selected
   */
  selectItem(id, selected) {
    let model = this.requireModel();
    if (typeof selected !== 'boolean' || !model.state.rows.some((row) => row[model.state.idKey] === id)) { throw new Error(this.text('invalidState')); }
    let ids = new Set(model.state.selection === 'single' && selected ? [] : model.selected);
    if (selected) { ids.add(id); }
    else { ids.delete(id); }
    return this.edit([...ids]);
  }

  destroyCallback() {
    this.disposed = true;
  }
}

List.bindAttributes(Object.fromEntries(Object.values(LIST_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
List.template = LIST_TEMPLATE;
List.rootStyles = styles;
