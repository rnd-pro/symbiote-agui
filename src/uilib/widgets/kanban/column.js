import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
import { UiComponent } from '../../shared/component.js';
import { KANBAN_COLUMN_TEMPLATE } from './template.js';

export class KanbanColumn extends UiComponent {
  init$ = {
    id: '',
    label: '',
    statusValue: false,
    unassigned: false,
    tone: false,
    count: 0,
    countLabel: '',
    emptyLabel: '',
    empty: true,
    cards: [],
  };

  constructor() {
    super();
    this.templateProcessors.add(/** @type {typeof import('@symbiotejs/symbiote/core/slotProcessor.js').slotProcessor} */ (itemizeProcessor));
  }
}

KanbanColumn.template = KANBAN_COLUMN_TEMPLATE;
