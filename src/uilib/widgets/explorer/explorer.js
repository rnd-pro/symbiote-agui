import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { List } from '../list/list.js';
import styles from '../list/styles.js';
import { deriveExplorer } from './model.js';
import { EXPLORER_TEMPLATE } from './template.js';

export class Explorer extends List {
  /** @type {HTMLTemplateElement | undefined} */
  defaultTemplate;
  constructor() {
    super();
    Object.assign(this.init$, {
      expanded: [],
      request: null,
      toggle_node: new ToolDescriptor({
        description: 'Expand or collapse an explorer branch by ID. Returns change metadata without node contents.',
        deps: [
          'unavailable',
        ],
        when: () => !this.$.unavailable,
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
          },
          required: [
            'id',
          ],
          additionalProperties: false,
        },
        execute: ({
          id,
        }) => this.toggleNode(id),
      }),
    });
  }

  resolveTemplate() {
    let supplied = super.resolveTemplate();
    if (supplied) { return supplied; }
    if (!this.defaultTemplate) {
      this.defaultTemplate = document.createElement('template');
      this.defaultTemplate.innerHTML = EXPLORER_TEMPLATE;
    }
    return this.defaultTemplate;
  }

  renderCallback() {
    super.renderCallback();
    this.sub('expanded', () => this.refresh());
  }

  stateInput() {
    return {
      ...super.stateInput(),
      idKey: 'id',
      selection: /** @type {import('../../../../types/uilib-data.js').UiDataSelection} */ (this.$.selection ?? this.getAttribute('selection') ?? 'single'),
    };
  }

  /** @param {import('../../../../types/uilib-list.js').UiListState} state */
  deriveModel(state) {
    let rows = deriveExplorer(/** @type {import('../../../../types/uilib-explorer.js').UiExplorerNode[]} */ (state.rows), this.$.expanded);
    let selected = new Set(state.value);
    let mask = state.filteredIds === null ? null : new Set(state.filteredIds);
    return super.deriveModel({
      ...state,
      idKey: 'id',
      value: state.value.filter((id) => rows.some((row) => row.id === id && !row.branch)),
      filteredIds: rows.filter((row) => row.visible && (!mask || mask.has(row.id))).map((row) => row.id),
      rows: rows.map((row) => ({
        ...row,
        indent: `${row.depth}rem`,
        nodeDisabled: state.disabled || state.readonly || state.loading || !!state.error || !!row.disabled || !row.branch && state.selection === 'none',
        nodeExpanded: row.branch ? String(row.open) : null,
        nodeSelected: row.branch ? null : String(selected.has(row.id)),
        nodeIcon: row.icon || (row.branch ? row.open ? 'folder_open' : 'folder' : 'insert_drive_file'),
        actionLabel: [
          this.text(row.branch ? row.open ? 'collapse' : 'expand' : 'select'),
          row.label,
        ].filter(Boolean).join(' '),
        moreLabel: this.text(row.message ? 'retry' : 'more'),
        showMore: row.open && !row.loading && (!!row.more || !!row.message && row.loaded === false),
        showMessage: !!row.message && (!row.branch || row.open),
        activateNode: (/** @type {MouseEvent} */ event) => row.branch ? this.toggleNode(row.id) : this.selectItem(event),
        loadMore: () => this.requestNode(row.id, row.message && row.loaded === false ? 'retry' : 'more'),
      })),
    });
  }

  /** @param {string[]} ids */
  edit(ids) {
    if (!Array.isArray(ids)) { throw new Error(this.text('invalidState')); }
    let model = this.requireModel();
    if (ids.some((id) => model.state.rows.some((row) => row.id === id && (row.branch || row.disabled)))) {
      throw new Error(this.text('unavailable'));
    }
    return super.edit(ids);
  }

  /** @param {string} id */
  toggleNode(id) {
    let node = this.requireModel().state.rows.find((row) => row.id === id);
    if (this.$.unavailable || !node?.branch || node.disabled) { throw new Error(this.text('unavailable')); }
    let expanded = new Set(/** @type {string[]} */ (this.$.expanded));
    let open = !expanded.has(id);
    if (open) { expanded.add(id); }
    else { expanded.delete(id); }
    this.$.expanded = [
      ...expanded,
    ];
    let target = this.getAttribute('expanded-pub-to')?.trim();
    if (target) { this.$[target] = this.$.expanded; }
    if (open && node.loaded === false && !node.loading) { this.requestNode(id, 'expand'); }
    return {
      id,
      expanded: open,
      changed: true,
    };
  }

  /**
   * @param {string} id
   * @param {import('../../../../types/uilib-explorer.js').UiExplorerRequest['action']} action
   */
  requestNode(id, action) {
    let node = this.requireModel().state.rows.find((row) => row.id === id);
    if (this.$.unavailable || !node?.branch || node.disabled || node.loading) { throw new Error(this.text('unavailable')); }
    let request = {
      id,
      action,
    };
    this.$.request = request;
    let target = this.getAttribute('request-pub-to')?.trim();
    if (target) { this.$[target] = request; }
  }
}

Explorer.rootStyles = styles;
