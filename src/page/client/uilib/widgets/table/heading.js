import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { TABLE_HOST_SELECTOR } from './constants.js';
import { UiComponent } from '../../shared/component.js';
import { TABLE_HEADING_TEMPLATE } from './template.js';

export class TableHeading extends UiComponent {
  componentDescription = () => JSON.stringify({
    tableId: this.closest(TABLE_HOST_SELECTOR)?.id || '',
    column: this.$.columnKey,
    label: this.$.label,
  });
  init$ = {
    id: '',
    headingId: '',
    columnKey: '',
    label: '',
    sortable: false,
    ariaSort: false,
    sortIcon: 'sort',
    selectAll: false,
    selectAllLabel: '',
    selected: false,
    mixed: false,
    unavailable: false,
    sort_column: new ToolDescriptor({
      description: 'Cycle this column through ascending, descending, and source order.',
      deps: [
        'sortable',
        'unavailable',
      ],
      when: () => !!this.$.sortable && !this.$.unavailable,
      execute: () => {
        let sort = /** @type {import('./table.js').Table['sortColumn']} */ (this.$['^sortColumn']);
        return sort(String(this.$.columnKey));
      },
    }),
    select_filtered: new ToolDescriptor({
      description: 'Toggle selection of all filtered rows, including other pages. Preserve selections outside the filter.',
      deps: [
        'selectAll',
        'unavailable',
      ],
      when: () => !!this.$.selectAll && !this.$.unavailable,
      execute: () => {
        let select = /** @type {import('./table.js').Table['selectFiltered']} */ (this.$['^selectFiltered']);
        return select();
      },
    }),
  };
}

TableHeading.template = TABLE_HEADING_TEMPLATE;
