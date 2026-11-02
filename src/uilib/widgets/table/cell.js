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
    selectionValue: false,
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
    for (let key of [
      'selected',
      'selectionType',
      'rowId',
    ]) {
      this.sub(key, () => {
        this.$.selectionValue = this.$.selectionType === 'radio'
          ? this.$.selected ? String(this.$.rowId) : '' : !!this.$.selected;
      });
    }
    this.sub('selectionValue', (value) => {
      let selected = this.$.selectionType === 'radio' ? value === String(this.$.rowId) : value === true;
      if (selected !== this.$.selected) { this.select(selected); }
    });
  }

  /** @param {boolean} selected */
  select(selected) {
    let select = /** @type {import('./table.js').Table['selectRow']} */ (this.$['^selectRow']);
    return select(String(this.$.rowId), selected);
  }
}

TableCell.template = TABLE_CELL_TEMPLATE;
