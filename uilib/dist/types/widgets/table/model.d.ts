/**
 * @param {import('../../types/uilib-table.js').UiTableState} state
 * @returns {import('../../types/uilib-table.js').UiTableModel}
 */
export declare function deriveTable(state: import('../../types/uilib-table.js').UiTableState): import('../../types/uilib-table.js').UiTableModel;
/**
 * @param {import('../../types/uilib-table.js').UiTableModel} model
 * @param {string[]} ids
 */
export declare function selectedIds(model: import('../../types/uilib-table.js').UiTableModel, ids: string[]): string[];
/** @param {import('../../types/uilib-table.js').UiTableModel} model */
export declare function toggleFiltered(model: import('../../types/uilib-table.js').UiTableModel): string[];
