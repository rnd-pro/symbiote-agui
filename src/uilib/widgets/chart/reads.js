import { DATA_LIMITS } from '../../shared/data/constants.js';
import { CHART_LIMITS } from './constants.js';

/**
 * @param {import('./chart.js').Chart} chart
 * @param {boolean} selection
 * @param {number} [offset]
 * @param {number} [limit]
 */
export function readChart(chart, selection, offset = 0, limit = 20) {
  let model = chart.requireModel();
  if (!Number.isInteger(offset) || offset < 0 || offset > CHART_LIMITS.rows
    || !Number.isInteger(limit) || limit < 1 || limit > DATA_LIMITS.pageSize) { throw new Error(chart.text('invalidState')); }
  let source = selection ? model.selected : model.state.loading || model.state.error ? [] : model.points;
  /** @type {(string | { id: string; x?: string; values?: Record<string, string>; truncated?: boolean })[]} */
  let items = [];
  let result = {
    offset,
    nextOffset: /** @type {number | null} */ (null),
    totalCount: source.length,
    items,
  };
  for (let index = offset; index < Math.min(source.length, offset + limit); index += 1) {
    let point = source[index];
    let item = typeof point === 'string' ? point : {
      id: point.id,
      x: point.x,
      values: Object.fromEntries(model.state.series.map((series, index) => [
        series.key,
        point.formatted[index],
      ])),
    };
    items.push(item);
    result.nextOffset = index + 1 < source.length ? index + 1 : null;
    if (new TextEncoder().encode(JSON.stringify(result)).byteLength <= DATA_LIMITS.readBytes) { continue; }
    items.pop();
    if (!items.length && typeof item !== 'string') {
      items.push({
        id: item.id,
        truncated: true,
      });
    }
    result.nextOffset = offset + items.length < source.length ? offset + items.length : null;
    break;
  }
  return result;
}
