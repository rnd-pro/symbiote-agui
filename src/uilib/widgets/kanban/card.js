import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { DATA_LIMITS } from '../../shared/data/constants.js';
import { KANBAN_CARD_TEMPLATE } from './template.js';

export class KanbanCard extends UiComponent {
  componentDescription = () => JSON.stringify({
    boardId: this.closest('agui-kanban')?.id || '',
    recordId: this.$.recordId,
  });
  init$ = {
    id: '',
    recordId: '',
    title: '',
    description: '',
    moveHint: '',
    tabIndex: -1,
    disabledText: 'true',
    unavailable: true,
    unavailableMessage: '',
    set_status: new ToolDescriptor({
      description: 'Set this card status to an enabled board column. Return only ID, status, and change/count metadata.',
      deps: [
        'unavailable',
      ],
      when: () => !this.$.unavailable,
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            minLength: 1,
            maxLength: DATA_LIMITS.id,
          },
        },
        required: [
          'status',
        ],
        additionalProperties: false,
      },
      execute: ({
        status,
      }) => this.edit(status),
    }),
  };

  /** @param {string} status */
  edit(status) {
    if (!this.isConnected || this.$.unavailable) { throw new Error(String(this.$.unavailableMessage)); }
    let move = /** @type {import('./kanban.js').Kanban['moveItem']} */ (this.$['^moveItem']);
    return move(String(this.$.recordId), status);
  }
}

KanbanCard.template = KANBAN_CARD_TEMPLATE;
