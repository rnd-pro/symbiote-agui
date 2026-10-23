import { TABLE_LIMITS } from './constants.js';
import { cellText } from '../../shared/data/values.js';

/**
 * @param {import('./table.js').Table} table
 * @param {boolean} selection
 * @param {number} [offset]
 * @param {number} [limit]
 */
export function readTable(table, selection, offset = 0, limit = 20) {
  let model = table.requireModel();
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > TABLE_LIMITS.pageSize) { throw new Error(table.text('invalidState')); }
  let visible = model.state.loading || model.state.error ? [] : model.visible;
  let source = selection ? model.selected : visible;
  let end = Math.min(source.length, offset + limit);
  /** @type {(string | { id: string; selected: boolean; cells?: Record<string, string>; truncated?: boolean })[]} */
  let items = [];
  let result = {
    offset,
    nextOffset: /** @type {number | null} */ (null),
    page: model.page,
    pageCount: model.pageCount,
    totalCount: model.state.rows.length,
    filteredCount: model.filtered.length,
    selectedCount: model.selected.length,
    items,
  };
  let size = () => new TextEncoder().encode(JSON.stringify(result)).byteLength;
  for (let index = offset; index < end; index += 1) {
    let row = visible[index];
    let item = selection ? model.selected[index] : {
      id: String(row[model.state.idKey]),
      selected: model.selected.includes(String(row[model.state.idKey])),
      cells: Object.fromEntries(model.state.columns.map((column) => [
        column.key,
        cellText(row, column, model.state),
      ])),
    };
    items.push(item);
    result.nextOffset = index + 1 < source.length ? index + 1 : null;
    if (size() <= TABLE_LIMITS.readBytes) { continue; }
    items.pop();
    if (!items.length && typeof item !== 'string') {
      items.push({
        id: item.id,
        selected: item.selected,
        truncated: true,
      });
    }
    result.nextOffset = offset + items.length < source.length ? offset + items.length : null;
    break;
  }
  return result;
}
