import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { TABLE_HOST_SELECTOR } from './constants.js';
import { UiComponent } from '../../shared/component.js';
import { TABLE_CELL_TEMPLATE } from './template.js';

export class TableCell extends UiComponent {
  componentDescription = () => JSON.stringify({
    tableId: this.closest(TABLE_HOST_SELECTOR)?.id || '',
    recordId: this.$.rowId,
    column: this.$.columnKey,
  });
  init$ = {
    id: '',
    rowId: '',
    columnKey: '',
    headingId: '',
    text: '',
    tone: false,
    cellClass: '',
    isSelection: false,
    selected: false,
    selectionType: 'checkbox',
    groupName: '',
    selectLabel: '',
    unavailable: false,
    set_selected: new ToolDescriptor({
      description: 'Select or deselect this record by stable ID.',
      deps: [
        'isSelection',
        'unavailable',
      ],
      when: () => !!this.$.isSelection && !this.$.unavailable,
      inputSchema: {
        type: 'object',
        properties: {
          selected: {
            type: 'boolean',
          },
        },
        required: [
          'selected',
        ],
        additionalProperties: false,
      },
      execute: ({
        selected,
      }) => this.select(selected),
    }),
  };

  renderCallback() {
    this.ref.selector.addEventListener('change', this.onChange);
  }

  /** @param {boolean} selected */
  select(selected) {
    let select = /** @type {import('./table.js').Table['selectRow']} */ (this.$['^selectRow']);
    return select(String(this.$.rowId), selected);
  }

  onChange = () => this.select(/** @type {HTMLInputElement} */ (this.ref.selector).checked);

  destroyCallback() {
    this.ref.selector.removeEventListener('change', this.onChange);
  }
}

TableCell.template = TABLE_CELL_TEMPLATE;
