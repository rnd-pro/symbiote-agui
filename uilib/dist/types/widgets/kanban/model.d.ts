/**
 * @param {import('../../types/uilib-kanban.js').UiKanbanState} state
 * @returns {import('../../types/uilib-kanban.js').UiKanbanModel}
 */
export declare function deriveKanban(state: import('../../types/uilib-kanban.js').UiKanbanState): import('../../types/uilib-kanban.js').UiKanbanModel;
/**
 * @param {import('../../types/uilib-kanban.js').UiKanbanModel} model
 * @param {string} id
 * @param {string} status
 */
export declare function moveRecord(model: import('../../types/uilib-kanban.js').UiKanbanModel, id: string, status: string): {
    changed: boolean;
    value: import("../../types/uilib-data.js").UiDataRecord[];
};
/** @param {unknown} value */
export declare function recordText(value: unknown): string;
