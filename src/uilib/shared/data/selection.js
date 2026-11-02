/**
 * @param {import('../../../../types/uilib-data.js').UiSelectionSource} state
 * @param {string[]} value
 */
export function effectiveSelection(state, value) {
  let ids = new Set(state.rows.map((row) => String(row[state.idKey])));
  let selected = state.selection === 'none' ? [] : value.filter((id) => ids.has(id));
  return state.selection === 'single' ? selected.slice(0, 1) : selected;
}

/**
 * @param {import('../../../../types/uilib-data.js').UiSelectionSource} state
 * @param {string[]} ids
 */
export function validateSelection(state, ids) {
  if (state.selection === 'none' || !Array.isArray(ids) || ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length
    || state.selection === 'single' && ids.length > 1) { throw new Error('invalidState'); }
  let available = new Set(state.rows.map((row) => String(row[state.idKey])));
  if (ids.some((id) => !available.has(id))) { throw new Error('invalidState'); }
  return [...ids];
}
