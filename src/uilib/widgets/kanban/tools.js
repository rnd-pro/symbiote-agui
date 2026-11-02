import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { DATA_LIMITS } from '../../shared/data/constants.js';
import { readKanban } from './reads.js';

/** @param {import('./kanban.js').Kanban} board */
export function kanbanTools(board) {
  return {
    move_item: new ToolDescriptor({
      description: 'Move one record to an enabled status column. Preserve other fields and record order. Return bounded ID, status, and change/count metadata.',
      deps: [
        'unavailable',
      ],
      when: () => !board.$.unavailable,
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: DATA_LIMITS.id,
          },
          status: {
            type: 'string',
            minLength: 1,
            maxLength: DATA_LIMITS.id,
          },
        },
        required: [
          'id',
          'status',
        ],
        additionalProperties: false,
      },
      execute: ({
        id,
        status,
      }) => board.moveItem(id, status),
    }),
    read_view: new ToolDescriptor({
      description: 'Read a bounded page of card IDs, titles, descriptions, and statuses. Optional status selects a column; empty status selects unassigned cards. Follow nextOffset.',
      deps: [
        'modelValid',
      ],
      when: () => !!board.$.modelValid,
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            maxLength: DATA_LIMITS.id,
          },
          offset: {
            type: 'integer',
            minimum: 0,
            maximum: DATA_LIMITS.rows,
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: DATA_LIMITS.pageSize,
          },
        },
        additionalProperties: false,
      },
      execute: ({
        status,
        offset,
        limit,
      }) => readKanban(board, status, offset, limit),
    }),
  };
}
