import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { TABLE_LIMITS } from './constants.js';
import { readTable } from './reads.js';

/** @param {import('./table.js').Table} table */
export function tableTools(table) {
  /**
   * @param {string} property
   * @param {Record<string, unknown>} schema
   * @param {import('../../../../../../types/uilib-table.js').UiTableProperty} key
   */
  let setter = (property, schema, key) => new ToolDescriptor({
    description: `Set this table's ${key}. Return bounded change/count metadata, not records or the selection array.`,
    deps: [
      'unavailable',
      'selectionEnabled',
    ],
    when: () => !table.$.unavailable && (key !== 'value' || !!table.$.selectionEnabled),
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
    execute: (input) => table.edit(key, input[property]),
  });
  /** @param {boolean} next */
  let pager = (next) => new ToolDescriptor({
    description: next ? 'Show the next local table page.' : 'Show the previous local table page.',
    deps: [
      next ? 'nextDisabled' : 'previousDisabled',
    ],
    when: () => !table.$[next ? 'nextDisabled' : 'previousDisabled'],
    execute: () => table.edit('page', table.requireModel().page + (next ? 1 : -1)),
  });
  /** @param {boolean} selection */
  let reader = (selection) => new ToolDescriptor({
    description: selection
      ? 'Read a bounded page of effective selected IDs. Follow nextOffset. No records are returned.'
      : 'Read a bounded page of currently visible formatted rows. Oversized rows return ID and truncated=true. Follow nextOffset.',
    deps: [
      'modelValid',
    ],
    when: () => !!table.$.modelValid,
    inputSchema: {
      type: 'object',
      properties: {
        offset: {
          type: 'integer',
          minimum: 0,
          maximum: TABLE_LIMITS.rows,
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: TABLE_LIMITS.pageSize,
        },
      },
      additionalProperties: false,
    },
    execute: ({
      offset,
      limit,
    }) => readTable(table, selection, offset, limit),
  });
  return {
    set_selection: setter('ids', {
      type: 'array',
      maxItems: TABLE_LIMITS.rows,
      uniqueItems: true,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: TABLE_LIMITS.id,
      },
    }, 'value'),
    set_sort: setter('sort', {
      anyOf: [
        {
          type: 'null',
        },
        {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              maxLength: TABLE_LIMITS.key,
            },
            direction: {
              enum: [
                'ascending',
                'descending',
              ],
            },
          },
          required: [
            'key',
            'direction',
          ],
          additionalProperties: false,
        },
      ],
    }, 'sort'),
    set_page: setter('page', {
      type: 'integer',
      minimum: 1,
      maximum: TABLE_LIMITS.rows,
    }, 'page'),
    read_view: reader(false),
    read_selection: reader(true),
    previous_page: pager(false),
    next_page: pager(true),
  };
}
