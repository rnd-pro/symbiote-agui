import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { bindItemSelection } from '../../shared/selectable-item.js';
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
    this.clearSelectionListeners = bindItemSelection(this.ref.row, () => !!this.$.selectable, () => this.select());
  }

  select() {
    if (!this.isConnected || !this.$.selectable) { return; }
    let select = /** @type {import('./table.js').Table['selectRow']} */ (this.$['^selectRow']);
    return select(String(this.$.rowId), this.$.selectionType === 'radio' || !this.$.selected);
  }

  destroyCallback() {
    this.clearSelectionListeners?.();
  }
}

TableRow.template = TABLE_ROW_TEMPLATE;
