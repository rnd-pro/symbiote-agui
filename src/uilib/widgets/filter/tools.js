import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { DATA_LIMITS } from '../../shared/data/constants.js';
import { FILTER_VALUE_SCHEMA } from './schemas.js';

/** @param {import('./filter.js').Filter} filter */
export function filterTools(filter) {
  /**
   * @param {'value' | 'query'} property
   * @param {Record<string, unknown>} schema
   */
  let setter = (property, schema) => new ToolDescriptor({
    description: `Set this filter's ${property}. Return bounded change/count metadata, not records.`,
    deps: [
      'unavailable',
    ],
    when: () => !filter.$.unavailable,
    inputSchema: {
      type: 'object',
      properties: {
        [property]: schema,
      },
      required: [
        property,
      ],
      additionalProperties: false,
    },
    execute: (input) => filter.edit(property, input[property]),
  });
  return {
    set_value: setter('value', {
      type: 'object',
      maxProperties: DATA_LIMITS.fields,
      additionalProperties: FILTER_VALUE_SCHEMA,
    }),
    set_query: setter('query', {
      type: 'string',
      maxLength: DATA_LIMITS.text,
    }),
    read_result: new ToolDescriptor({
      description: 'Read a bounded page of matching record IDs. Follow nextOffset. No records are returned.',
      deps: [
        'modelValid',
      ],
      when: () => !!filter.$.modelValid,
      inputSchema: {
        type: 'object',
        properties: {
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
        offset,
        limit,
      }) => filter.readResult(offset, limit),
    }),
  };
}
