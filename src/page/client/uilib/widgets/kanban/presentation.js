import { recordText } from './model.js';

/**
 * @param {import('./kanban.js').Kanban} board
 * @param {import('../../../../../../types/uilib-kanban.js').UiKanbanState} state
 */
export function presentKanban(board, state) {
  let model = board.model;
  let text = (/** @type {string} */ key) => String(state.texts?.[key] ?? '');
  let unavailable = !model || state.disabled || state.readonly || state.loading || !!state.error
    || !state.columns.some((column) => !column.disabled);
  let hidden = !model || state.loading || !!state.error;
  board.set$({
    unavailable,
    modelValid: !!model,
    boardLabel: state.label,
    moveHint: text('moveHint'),
    busyText: String(state.loading),
    surfaceHidden: hidden,
    statusMessage: state.loading ? text('loading') : state.error || (board.issue ? text(board.issue) : !state.value.length ? text('empty') : ''),
    columnItems: (hidden ? [] : model?.groups ?? []).map((group) => ({
      id: group.id,
      statusValue: group.status ?? false,
      unassigned: group.status === null ? 'true' : false,
      label: group.label,
      tone: group.tone ?? false,
      count: group.rows.length,
      countLabel: text('items'),
      empty: !group.rows.length,
      emptyLabel: text('emptyColumn'),
      cards: group.rows.map((row) => ({
        id: String(row[state.idKey]),
        recordId: String(row[state.idKey]),
        title: recordText(row[state.titleKey]) || text('untitled'),
        description: state.descriptionKey ? recordText(row[state.descriptionKey]) : '',
        moveHint: text('moveHint'),
        tabIndex: unavailable ? -1 : 0,
        disabledText: String(unavailable),
        unavailable,
        unavailableMessage: text('unavailable'),
      })),
    })),
  });
}
