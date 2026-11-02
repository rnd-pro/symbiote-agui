import { validateRows, validateIds } from '../../shared/data/validate.js';
import { effectiveSelection } from '../../shared/data/selection.js';

/**
 * @param {import('../../../../types/uilib-list.js').UiListState} state
 * @returns {import('../../../../types/uilib-list.js').UiListModel}
 */
export function deriveList(state) {
  validateRows(state.rows, state.idKey);
  validateIds(state.value);
  if (state.filteredIds !== null) { validateIds(state.filteredIds); }
  if (![
    'none',
    'single',
    'multiple',
  ].includes(state.selection)) { throw new Error('invalidState'); }
  let mask = state.filteredIds === null ? null : new Set(state.filteredIds);
  return {
    state,
    filtered: state.rows.filter((row) => !mask || mask.has(String(row[state.idKey]))),
    selected: effectiveSelection(state, state.value),
  };
}
