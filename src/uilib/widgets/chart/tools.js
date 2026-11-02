import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { DATA_LIMITS } from '../../shared/data/constants.js';
import { CHART_LIMITS } from './constants.js';
import { readChart } from './reads.js';

/** @param {import('./chart.js').Chart} chart */
export function chartTools(chart) {
  /** @param {boolean} selection */
  let reader = (selection) => new ToolDescriptor({
    description: selection ? 'Read a bounded page of effective selected record IDs.' : 'Read bounded formatted chart data, excluding unrelated record fields. Follow nextOffset.',
    deps: [
      'modelValid',
    ],
    when: () => !!chart.$.modelValid,
    inputSchema: {
      type: 'object',
      properties: {
        offset: {
          type: 'integer',
          minimum: 0,
          maximum: CHART_LIMITS.rows,
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
    }) => readChart(chart, selection, offset, limit),
  });
  return {
    set_selection: new ToolDescriptor({
      description: 'Set source record IDs selected by this chart. Return bounded change/count metadata without records or full selections.',
      deps: [
        'unavailable',
      ],
      when: () => !chart.$.unavailable,
      inputSchema: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            maxItems: CHART_LIMITS.rows,
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
      }) => chart.setSelection(ids),
    }),
    read_view: reader(false),
    read_selection: reader(true),
  };
}
