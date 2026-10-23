import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { TABLE_ROW_TEMPLATE } from './template.js';

export class TableRow extends UiComponent {
  init$ = {
    id: '',
    rowId: '',
    cells: [],
  };

  constructor() {
    super();
    this.templateProcessors.add(/** @type {typeof import('@symbiotejs/symbiote/core/slotProcessor.js').slotProcessor} */ (itemizeProcessor));
  }
}

TableRow.template = TABLE_ROW_TEMPLATE;
