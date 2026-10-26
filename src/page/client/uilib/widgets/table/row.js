import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { TABLE_ROW_TEMPLATE } from './template.js';

export class TableRow extends UiComponent {
  init$ = {
    id: '',
    rowId: '',
    cells: [],
    selectionType: 'checkbox',
    selected: false,
    selectable: false,
    selectedText: false,
    tabIndex: -1,
  };

  constructor() {
    super();
    this.templateProcessors.add(/** @type {typeof import('@symbiotejs/symbiote/core/slotProcessor.js').slotProcessor} */ (itemizeProcessor));
  }

  renderCallback() {
    this.ref.row.addEventListener('click', this.onClick);
    this.ref.row.addEventListener('keydown', this.onKeyDown);
  }

  select() {
    if (!this.isConnected || !this.$.selectable) { return; }
    let select = /** @type {import('./table.js').Table['selectRow']} */ (this.$['^selectRow']);
    return select(String(this.$.rowId), this.$.selectionType === 'radio' || !this.$.selected);
  }

  /** @param {MouseEvent} event */
  onClick = (event) => {
    let target = event.target;
    if (event.defaultPrevented || !(target instanceof Element)
      || target.closest('a, button, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]')) { return; }
    let selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.containsNode(this.ref.row, true)) { return; }
    this.select();
  };

  /** @param {KeyboardEvent} event */
  onKeyDown = (event) => {
    if (event.defaultPrevented || event.repeat || event.target !== this.ref.row || !this.$.selectable
      || event.key !== 'Enter' && event.key !== ' ') { return; }
    event.preventDefault();
    this.select();
  };

  destroyCallback() {
    this.ref.row.removeEventListener('click', this.onClick);
    this.ref.row.removeEventListener('keydown', this.onKeyDown);
  }
}

TableRow.template = TABLE_ROW_TEMPLATE;
