import { cellValue } from '../../shared/data/values.js';
import { validateTable } from './validate.js';

/**
 * @param {import('../../../../../../types/uilib-table.js').UiTableState} state
 * @returns {import('../../../../../../types/uilib-table.js').UiTableModel}
 */
export function deriveTable(state) {
  validateTable(state);
  let mask = state.filteredIds === null ? null : new Set(state.filteredIds);
  let filtered = state.rows.filter((row) => !mask || mask.has(String(row[state.idKey])));
  if (state.sort) {
    let column = /** @type {import('../../../../../../types/uilib-table.js').UiTableColumn} */ (state.columns.find((column) => column.key === state.sort?.key));
    let direction = state.sort.direction === 'ascending' ? 1 : -1;
    let collator = new Intl.Collator(state.locale, {
      sensitivity: 'base',
      numeric: true,
    });
    filtered.sort((left, right) => {
      let a = cellValue(left, column);
      let b = cellValue(right, column);
      if (a === null || b === null) { return a === b ? 0 : a === null ? 1 : -1; }
      return direction * (typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b)));
    });
  }
  let ids = new Set(state.rows.map((row) => String(row[state.idKey])));
  let selected = state.selection === 'none' ? [] : state.value.filter((id) => ids.has(id));
  if (state.selection === 'single') { selected = selected.slice(0, 1); }
  let pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  let page = Math.min(state.page, pageCount);
  return {
    state,
    filtered,
    visible: filtered.slice((page - 1) * state.pageSize, page * state.pageSize),
    selected,
    page,
    pageCount,
  };
}

/**
 * @param {import('../../../../../../types/uilib-table.js').UiTableModel} model
 * @param {string[]} ids
 */
export function selectedIds(model, ids) {
  if (model.state.selection === 'none' || !Array.isArray(ids) || ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length
    || model.state.selection === 'single' && ids.length > 1) { throw new Error('invalidState'); }
  let available = new Set(model.state.rows.map((row) => String(row[model.state.idKey])));
  if (ids.some((id) => !available.has(id))) { throw new Error('invalidState'); }
  return [...ids];
}

/** @param {import('../../../../../../types/uilib-table.js').UiTableModel} model */
export function toggleFiltered(model) {
  if (model.state.selection !== 'multiple') { throw new Error('invalidState'); }
  let filteredIds = model.filtered.map((row) => String(row[model.state.idKey]));
  let selected = new Set(model.selected);
  let all = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  for (let id of filteredIds) {
    if (all) { selected.delete(id); }
    else { selected.add(id); }
  }
  return [...selected];
}
