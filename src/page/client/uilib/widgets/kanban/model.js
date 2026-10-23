import { DATA_LIMITS } from '../../shared/data/constants.js';
import { nonempty, validateRows, validateOptions } from '../../shared/data/validate.js';

/**
 * @param {import('../../../../../../types/uilib-kanban.js').UiKanbanState} state
 * @returns {import('../../../../../../types/uilib-kanban.js').UiKanbanModel}
 */
export function deriveKanban(state) {
  validateRows(state.value, state.idKey);
  if (!nonempty(state.statusKey, DATA_LIMITS.key) || state.statusKey === state.idKey
    || !nonempty(state.titleKey, DATA_LIMITS.key) || typeof state.descriptionKey !== 'string'
    || state.descriptionKey.length > DATA_LIMITS.key) { throw new Error('invalidState'); }
  try { validateOptions(state.columns); } catch { throw new Error('invalidColumns'); }
  if (!state.columns.length || state.columns.length > DATA_LIMITS.fields
    || state.columns.some((column) => !nonempty(column.value, DATA_LIMITS.id) || !nonempty(column.label, DATA_LIMITS.text)
      || column.disabled !== undefined && typeof column.disabled !== 'boolean')) { throw new Error('invalidColumns'); }
  let known = new Set(state.columns.map((column) => column.value));
  /** @type {import('../../../../../../types/uilib-kanban.js').UiKanbanGroup[]} */
  let groups = state.columns.map((column) => ({
    id: `status:${column.value}`,
    status: column.value,
    label: column.label,
    tone: column.tone,
    rows: [],
  }));
  let byStatus = new Map(groups.map((group) => [
    group.status,
    group,
  ]));
  /** @type {import('../../../../../../types/uilib-data.js').UiDataRecord[]} */
  let unassigned = [];
  for (let row of state.value) {
    let status = row[state.statusKey];
    if (typeof status === 'string' && known.has(status)) { byStatus.get(status)?.rows.push(row); }
    else { unassigned.push(row); }
  }
  if (unassigned.length) {
    groups.push({
      id: 'unassigned',
      status: null,
      label: String(state.texts?.unassigned ?? ''),
      rows: unassigned,
    });
  }
  return {
    state,
    groups,
  };
}

/**
 * @param {import('../../../../../../types/uilib-kanban.js').UiKanbanModel} model
 * @param {string} id
 * @param {string} status
 */
export function moveRecord(model, id, status) {
  let state = model.state;
  let row = state.value.find((row) => row[state.idKey] === id);
  if (!row || !state.columns.some((column) => column.value === status && !column.disabled)) { throw new Error('invalidState'); }
  let changed = row[state.statusKey] !== status;
  return {
    changed,
    value: changed ? state.value.map((item) => item === row ? {
      ...item,
      [state.statusKey]: status,
    } : item) : state.value,
  };
}

/** @param {unknown} value */
export function recordText(value) {
  return typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}
