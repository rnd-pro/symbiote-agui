import { DATA_LIMITS } from '../../shared/data/constants.js';
import { recordText } from './model.js';

/**
 * @param {import('./kanban.js').Kanban} board
 * @param {string} [status]
 * @param {number} [offset]
 * @param {number} [limit]
 */
export function readKanban(board, status, offset = 0, limit = 20) {
  let model = board.requireModel();
  let state = model.state;
  if (!Number.isInteger(offset) || offset < 0 || offset > DATA_LIMITS.rows
    || !Number.isInteger(limit) || limit < 1 || limit > DATA_LIMITS.pageSize
    || status !== undefined && status !== '' && !state.columns.some((column) => column.value === status)) { throw new Error(board.text('invalidState')); }
  let rows = status === undefined ? state.value : model.groups.find((group) => group.status === (status || null))?.rows ?? [];
  if (state.loading || state.error) { rows = []; }
  /** @type {{ id: string; title?: string; description?: string; status?: string | null; unassigned?: boolean; truncated?: boolean }[]} */
  let items = [];
  let result = {
    offset,
    nextOffset: /** @type {number | null} */ (null),
    totalCount: state.value.length,
    matchingCount: rows.length,
    items,
  };
  let size = () => new TextEncoder().encode(JSON.stringify(result)).byteLength;
  for (let index = offset; index < Math.min(rows.length, offset + limit); index += 1) {
    let row = rows[index];
    let status = row[state.statusKey];
    let item = {
      id: String(row[state.idKey]),
      title: recordText(row[state.titleKey]) || board.text('untitled'),
      description: state.descriptionKey ? recordText(row[state.descriptionKey]) : '',
      status: typeof status === 'string' ? status : null,
      unassigned: !state.columns.some((column) => column.value === status),
    };
    items.push(item);
    result.nextOffset = index + 1 < rows.length ? index + 1 : null;
    if (size() <= DATA_LIMITS.readBytes) { continue; }
    items.pop();
    if (!items.length) {
      items.push({
        id: item.id,
        truncated: true,
      });
    }
    result.nextOffset = offset + items.length < rows.length ? offset + items.length : null;
    break;
  }
  return result;
}
