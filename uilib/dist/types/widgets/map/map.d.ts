import { UiComponent } from '../../shared/component.js';
import { MAP_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class AguiMap extends UiComponent {
    domId: string;
    componentDescription: () => string;
    /** @type {import('../../types/uilib-map.js').UiMapModel | undefined} */
    model: import('../../types/uilib-map.js').UiMapModel | undefined;
    /** @type {'invalidRows' | 'invalidState' | 'invalidTiles' | undefined} */
    issue: 'invalidRows' | 'invalidState' | 'invalidTiles' | undefined;
    /** @type {'loadFailed' | 'renderFailed' | undefined} */
    runtimeError: 'loadFailed' | 'renderFailed' | undefined;
    /** @type {typeof import('./runtime/index.js') | undefined} */
    runtime: typeof import('./runtime/index.js') | undefined;
    /** @type {import('../../types/uilib-map.js').UiMapRenderer | undefined} */
    renderer: import('../../types/uilib-map.js').UiMapRenderer | undefined;
    /** @type {ResizeObserver | undefined} */
    resizeObserver: ResizeObserver | undefined;
    disposed: boolean;
    paintFrame: number;
    tileError: boolean;
    init$: {
        set_selection: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        set_view: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        fit_records: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        read_view: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        rows: never[];
        value: never[];
        view: {
            center: number[];
            zoom: number;
        };
        tiles: null;
        texts: {};
        runtimeReady: boolean;
        rendererReady: boolean;
        viewReady: boolean;
        unavailable: boolean;
        selectionUnavailable: boolean;
        fitUnavailable: boolean;
        modelValid: boolean;
        mapHidden: boolean;
        statusMessage: string;
        statusState: string;
        mapLabel: string;
        mapDescription: string;
        attribution: string;
        attributionUrl: string;
        skippedCount: number;
        skippedLabel: string;
        fitLabel: string;
        zoomInLabel: string;
        zoomOutLabel: string;
        dataLabel: string;
        dataTableId: string;
        dataSelectionMode: string;
        dataDisabled: boolean;
        dataRows: never[];
        dataColumns: never[];
        effectiveSelected: never[];
        selectIds: (/** @type {string[]} */ ids: string[]) => {
            changed: boolean;
            selectedCount: number;
            totalCount: number;
        };
        onFit: () => {
            changed: boolean;
            view: import("../../types/uilib-map.js").UiMapView;
        };
        onZoomIn: () => void;
        onZoomOut: () => void;
    };
    renderCallback(): void;
    connectedCallback(): void;
    loadRuntime(): Promise<void>;
    /** @returns {import('../../types/uilib-map.js').UiMapState} */
    stateInput(): import('../../types/uilib-map.js').UiMapState;
    refresh(): void;
    schedulePaint(): void;
    paint(): void;
    /** @param {string} key */
    text(key: string): string;
    requireModel(): import("../../types/uilib-map.js").UiMapModel;
    /** @param {boolean} [selection] */
    assertAvailable(selection?: boolean): void;
    /** @param {'value' | 'view'} property
     * @param {string[] | import('../../types/uilib-map.js').UiMapView} value
     */
    publish(property: 'value' | 'view', value: string[] | import('../../types/uilib-map.js').UiMapView): void;
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
    /** @param {import('../../types/uilib-map.js').UiMapView} view */
    setView(view: import('../../types/uilib-map.js').UiMapView): {
        changed: boolean;
        view: import("../../types/uilib-map.js").UiMapView;
    };
    fitRecords(): {
        changed: boolean;
        view: import("../../types/uilib-map.js").UiMapView;
    };
    /** @param {number} amount */
    zoom(amount: number): void;
    destroyCallback(): void;
}
export declare namespace AguiMap {
    export { MAP_TEMPLATE as template };
    export { styles as rootStyles };
}
