import { DATA_LIMITS } from '../../shared/data/constants.js';
import { MAP_LIMITS } from './constants.js';

/**
 * @param {import('./map.js').AguiMap} map
 * @param {number} [offset]
 * @param {number} [limit]
 */
export function readMap(map, offset = 0, limit = 20) {
  if (!Number.isInteger(offset) || offset < 0 || offset > MAP_LIMITS.rows
    || !Number.isInteger(limit) || limit < 1 || limit > DATA_LIMITS.pageSize || !map.renderer) { throw new Error(map.text('unavailable')); }
  // Apply any pending incoming viewport before computing visibility.
  map.paint();
  let model = map.requireModel();
  let ids = map.renderer.visibleIds();
  let result = {
    view: map.renderer.view(),
    selectedCount: model.selected.length,
    skippedCount: model.skippedCount,
    totalCount: ids.length,
    offset,
    items: /** @type {string[]} */ ([]),
    nextOffset: /** @type {number | null} */ (null),
  };
  for (let id of ids.slice(offset, offset + limit)) {
    result.items.push(id);
    result.nextOffset = offset + result.items.length < ids.length ? offset + result.items.length : null;
    if (new TextEncoder().encode(JSON.stringify(result)).byteLength <= DATA_LIMITS.readBytes) { continue; }
    result.items.pop();
    result.nextOffset = offset + result.items.length;
    break;
  }
  return result;
}
