import { UiComponent } from '../../shared/component.js';
import { isItemSelectionClick } from '../../shared/selectable-item.js';
import { sameData } from '../../shared/data/equal.js';
import { validateSelection } from '../../shared/data/selection.js';
import { emit } from '../../shared/events.js';
import { LIST_ATTRIBUTES } from './constants.js';
import { deriveList } from './model.js';
import { listTools } from './tools.js';
import { LIST_TEMPLATE } from './template.js';
import styles from './styles.js';

export class List extends UiComponent {
  /** @type {HTMLTemplateElement | undefined} */
  inlineTemplate;
  /** @type {HTMLTemplateElement | undefined} */
  itemTemplate;
  /** @type {ElementInternals | undefined} */
  semantics;
  /** @type {import('../../../../types/uilib-list.js').UiListModel | undefined} */
  model;
  issue = '';
  disposed = false;
  handledEvents = new WeakSet();
  componentDescription = () => JSON.stringify({
    id: this.id,
    label: this.stateInput().label,
  });
  init$ = {
    items: [],
    value: [],
    filteredIds: null,
    texts: {},
    ...Object.fromEntries(Object.keys(LIST_ATTRIBUTES).map((key) => [
      key,
      undefined,
    ])),
    itemsToRender: [],
    unavailable: true,
    selectionEnabled: false,
    selectItem: (/** @type {import('../../../../types/uilib-list.js').UiListSelectionEvent} */ event) => this.selectItem(event),
    ...listTools(this),
  };

  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    this.inlineTemplate = /** @type {HTMLTemplateElement | undefined} */ ([...this.children].find((child) => child instanceof HTMLTemplateElement));
    this.itemTemplate = this.resolveTemplate();
    let shell = document.createElement('template');
    shell.innerHTML = LIST_TEMPLATE;
    shell.content.querySelector('[itemize]')?.append(this.itemTemplate?.cloneNode(true) ?? document.createElement('template'));
    this.replaceChildren();
    super.render(shell.content, shadow);
  }

  resolveTemplate() {
    let selector = this.$.itemTemplate ?? this.getAttribute('item-template');
    if (!selector) { return this.inlineTemplate; }
    try {
      let root = /** @type {Document | ShadowRoot} */ (this.getRootNode());
      let template = root.querySelector(String(selector)) || document.querySelector(String(selector));
      return template instanceof HTMLTemplateElement ? template : undefined;
    } catch { return undefined; }
  }

  renderCallback() {
    this.semantics = this.attachInternals();
    this.semantics.role = 'list';
    this.ref.items.addEventListener('click', this.onClick);
    for (let key of [
      'items',
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
      rows: this.$.items,
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
    this.issue = '';
    try {
      if (!this.itemTemplate || this.resolveTemplate() !== this.itemTemplate) { throw new Error('invalidState'); }
      this.model = deriveList(state);
    } catch (error) {
      this.model = undefined;
      this.issue = error instanceof Error && error.message === 'invalidRows' ? 'invalidRows' : 'invalidState';
    }
    let model = this.model;
    let unavailable = !model || state.disabled || state.readonly || state.loading || !!state.error;
    let selected = new Set(model?.selected);
    let selectable = state.selection !== 'none';
    if (this.semantics) { this.semantics.ariaLabel = state.label; }
    this.setAttribute('aria-busy', String(state.loading));
    this.dataset.state = state.loading ? 'loading' : state.error || this.issue ? 'error' : !model?.filtered.length ? 'empty' : 'ready';
    this.dataset.message = state.loading ? this.text('loading') : state.error || (this.issue ? this.text(this.issue) : !model?.filtered.length ? this.text('empty') : '');
    this.set$({
      unavailable,
      selectionEnabled: selectable && !!model,
      itemsToRender: state.loading || state.error || !model ? null : model.filtered.map((record) => ({
        ...record,
        _selected: selected.has(String(record[state.idKey])),
        _selectionDisabled: unavailable || !selectable,
      })),
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
    return this.result(changed);
  }

  /** @param {boolean} changed */
  result(changed) {
    return {
      changed,
      selectedCount: this.model?.selected.length ?? 0,
      filteredCount: this.model?.filtered.length ?? 0,
    };
  }

  /** @param {MouseEvent} event */
  onClick = (event) => {
    if (event.target instanceof Element && event.target.closest('agui-list') === this
      && isItemSelectionClick(event, this.ref.items)) { this.selectItem(event); }
  };

  /** @param {import('../../../../types/uilib-list.js').UiListSelectionEvent} event */
  selectItem(event) {
    if (event.defaultPrevented || this.handledEvents.has(event) || !this.isConnected || this.disposed || this.$.unavailable || !this.$.selectionEnabled) { return this.result(false); }
    let item = event.target instanceof Element ? event.target : null;
    while (item && item.parentElement !== this.ref.items) {
      let root = item.getRootNode();
      item = item.parentElement || (root instanceof ShadowRoot ? root.host : null);
    }
    let index = item ? [...this.ref.items.children].indexOf(item) : -1;
    let model = this.requireModel();
    let record = model.filtered[index];
    if (!record) { return this.result(false); }
    this.handledEvents.add(event);
    let id = String(record[model.state.idKey]);
    let input = event.target;
    // WebMCP activates the control without changing its checked state first.
    let selected = event.type !== 'webmcp' && input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')
      ? input.checked : model.state.selection === 'single' || !model.selected.includes(id);
    let ids = new Set(model.state.selection === 'single' && selected ? [] : model.selected);
    if (selected) { ids.add(id); }
    else { ids.delete(id); }
    return this.edit([...ids]);
  }

  destroyCallback() {
    this.disposed = true;
    this.ref.items.removeEventListener('click', this.onClick);
  }
}

List.bindAttributes(Object.fromEntries(Object.values(LIST_ATTRIBUTES).map((attribute) => [
  attribute,
  `attribute-${attribute}`,
])));
List.template = LIST_TEMPLATE;
List.rootStyles = styles;
