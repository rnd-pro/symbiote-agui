import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { DATA_LIMITS } from '../../shared/data/constants.js';

/** @param {import('./list.js').List} list */
export function listTools(list) {
  return {
    set_selection: new ToolDescriptor({
      description: 'Select this list\'s items by stable ID. Returns change/count metadata without records.',
      deps: [
        'unavailable',
        'selectionEnabled',
      ],
      when: () => !list.$.unavailable && !!list.$.selectionEnabled,
      inputSchema: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            maxItems: DATA_LIMITS.rows,
            uniqueItems: true,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: DATA_LIMITS.id,
            },
          },
        },
        required: [
          'ids',
        ],
        additionalProperties: false,
      },
      execute: ({
        ids,
      }) => list.edit(ids),
    }),
  };
}
