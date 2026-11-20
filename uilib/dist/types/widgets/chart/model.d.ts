/**
 * @param {import('../../types/uilib-chart.js').UiChartState} state
 * @returns {import('../../types/uilib-chart.js').UiChartModel}
 */
export declare function deriveChart(state: import('../../types/uilib-chart.js').UiChartState): import('../../types/uilib-chart.js').UiChartModel;
/**
 * @param {import('../../types/uilib-chart.js').UiChartModel} model
 * @param {string[]} ids
 */
export declare function selectedIds(model: import('../../types/uilib-chart.js').UiChartModel, ids: string[]): string[];
