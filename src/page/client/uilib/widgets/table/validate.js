import { TABLE_LIMITS } from './constants.js';
import { validateFields, validateRows, validateIds, validateLocale, record } from '../../shared/data/validate.js';

/** @param {import('../../../../../../types/uilib-table.js').UiTableState} state */
export function validateTable(state) {
  try { validateFields(state.columns); } catch { throw new Error('invalidColumns'); }
  if (state.columns.some((column) => column.sortable !== undefined && typeof column.sortable !== 'boolean')) { throw new Error('invalidColumns'); }
  validateRows(state.rows, state.idKey);
  validateIds(state.value);
  if (state.filteredIds !== null) { validateIds(state.filteredIds); }
  if (![
    'none',
    'single',
    'multiple',
  ].includes(state.selection) || !Number.isInteger(state.page) || state.page < 1
    || !Number.isInteger(state.pageSize) || state.pageSize < 1 || state.pageSize > TABLE_LIMITS.pageSize) { throw new Error('invalidState'); }
  let sort = state.sort;
  if (sort !== null && (!record(sort) || ![
    'ascending',
    'descending',
  ].includes(sort.direction)
    || !state.columns.some((column) => column.key === sort.key && column.sortable))) { throw new Error('invalidState'); }
  validateLocale(state.locale);
}
