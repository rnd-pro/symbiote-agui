import { UiComponent } from '../../shared/component.js';
import { CHART_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Chart extends UiComponent {
    domId: string;
    componentDescription: () => string;
    /** @type {import('../../types/uilib-chart.js').UiChartModel | undefined} */
    model: import('../../types/uilib-chart.js').UiChartModel | undefined;
    /** @type {import('../../types/uilib-chart.js').UiChartIssue | undefined} */
    issue: import('../../types/uilib-chart.js').UiChartIssue | undefined;
    /** @type {'loadFailed' | 'renderFailed' | undefined} */
    runtimeError: 'loadFailed' | 'renderFailed' | undefined;
    /** @type {typeof import('./runtime/index.js') | undefined} */
    runtime: typeof import('./runtime/index.js') | undefined;
    /** @type {import('../../types/uilib-chart.js').UiChartRenderer | undefined} */
    renderer: import('../../types/uilib-chart.js').UiChartRenderer | undefined;
    /** @type {(() => void) | undefined} */
    stopWatching: (() => void) | undefined;
    disposed: boolean;
    paintFrame: number;
    init$: {
        set_selection: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        read_view: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        read_selection: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        rows: never[];
        series: never[];
        value: never[];
        texts: {};
        runtimeReady: boolean;
        unavailable: boolean;
        modelValid: boolean;
        plotHidden: boolean;
        statusMessage: string;
        statusState: string;
        chartLabel: string;
        chartDescription: string;
        dataLabel: string;
        dataTableId: string;
        dataSelectionMode: string;
        dataLoading: boolean;
        dataError: string;
        dataDisabled: boolean;
        dataRows: never[];
        dataColumns: never[];
        effectiveSelected: never[];
        selectIds: (/** @type {string[]} */ ids: string[]) => {
            changed: boolean;
            selectedCount: number;
            totalCount: number;
        };
    };
    renderCallback(): void;
    connectedCallback(): void;
    loadRuntime(): Promise<void>;
    /** @returns {import('../../types/uilib-chart.js').UiChartState} */
    stateInput(): import('../../types/uilib-chart.js').UiChartState;
    refresh(): void;
    schedulePaint(): void;
    paint(): void;
    /** @param {string} key */
    text(key: string): string;
    requireModel(): import("../../types/uilib-chart.js").UiChartModel;
    /** @param {string[]} ids */
    setSelection(ids: string[]): {
        changed: boolean;
        selectedCount: number;
        totalCount: number;
    };
    /** @param {string} id */
    selectPoint(id: string): {
        changed: boolean;
        selectedCount: number;
        totalCount: number;
    };
    destroyCallback(): void;
}
export declare namespace Chart {
    export { CHART_TEMPLATE as template };
    export { styles as rootStyles };
}
