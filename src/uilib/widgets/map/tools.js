import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { DATA_LIMITS } from '../../shared/data/constants.js';
import { MAP_LIMITS } from './constants.js';
import { readMap } from './reads.js';

/** @param {import('./map.js').AguiMap} map */
export function mapTools(map) {
  return {
    set_selection: new ToolDescriptor({
      description: 'Select valid marker source IDs without editing records.',
      deps: [
        'selectionUnavailable',
      ],
      when: () => !map.$.selectionUnavailable,
      inputSchema: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            maxItems: MAP_LIMITS.rows,
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
      }) => map.setSelection(ids),
    }),
    set_view: new ToolDescriptor({
      description: 'Set map center and zoom; publish only a changed viewport.',
      deps: [
        'unavailable',
      ],
      when: () => !map.$.unavailable,
      inputSchema: {
        type: 'object',
        properties: {
          center: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: {
              type: 'number',
              minimum: -180,
              maximum: 180,
            },
          },
          zoom: {
            type: 'integer',
            minimum: 0,
            maximum: MAP_LIMITS.zoom,
          },
        },
        required: [
          'center',
          'zoom',
        ],
        additionalProperties: false,
      },
      execute: ({
        center,
        zoom,
      }) => map.setView({
        center,
        zoom,
      }),
    }),
    fit_records: new ToolDescriptor({
      description: 'Fit the viewport to all records with valid coordinates.',
      deps: [
        'fitUnavailable',
      ],
      when: () => !map.$.fitUnavailable,
      execute: () => map.fitRecords(),
    }),
    read_view: new ToolDescriptor({
      description: 'Read the viewport, skipped count, and a bounded page of visible marker IDs. Follow nextOffset.',
      deps: [
        'viewReady',
        'mapLabel',
      ],
      when: () => !!map.$.viewReady,
      inputSchema: {
        type: 'object',
        properties: {
          offset: {
            type: 'integer',
            minimum: 0,
            maximum: MAP_LIMITS.rows,
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
      }) => readMap(map, offset, limit),
    }),
  };
}
