import { cellText, cellValue, rangeValue } from '../../shared/data/values.js';
import { validateFilter } from './validate.js';

/**
 * @param {import('../../../../../../types/uilib-filter.js').UiFilterState} state
 * @returns {import('../../../../../../types/uilib-filter.js').UiFilterModel}
 */
export function deriveFilter(state) {
  validateFilter(state);
  let fold = (/** @type {string} */ value) => value.toLocaleLowerCase(state.locale);
  let query = fold(state.query.trim());
  let matching = state.rows.filter((row) => {
    if (query && !state.fields.some((field) => fold(cellText(row, field, state)).includes(query))) { return false; }
    return Object.entries(state.value).every(([
      key,
      filter,
    ]) => {
      let field = /** @type {import('../../../../../../types/uilib-data.js').UiDataField} */ (state.fields.find((field) => field.key === key));
      let value = cellValue(row, field);
      if (typeof filter === 'string') {
        if (!filter) { return true; }
        if (field.filter === 'contains') { return fold(String(value ?? '')).includes(fold(filter)); }
        return value !== null && (field.type === 'boolean' ? String(!!value) : String(value)) === filter;
      }
      let min = rangeValue(field, filter.min);
      let max = rangeValue(field, filter.max, true);
      return min === null && max === null || typeof value === 'number' && (min === null || value >= min) && (max === null || value <= max);
    });
  });
  return {
    state,
    ids: matching.map((row) => String(row[state.idKey])),
  };
}
