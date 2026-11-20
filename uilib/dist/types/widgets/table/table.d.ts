import { UiComponent } from '../../shared/component.js';
import { TABLE_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Table extends UiComponent {
    componentDescription: () => string;
    domId: string;
    /** @type {import('../../types/uilib-table.js').UiTableModel | undefined} */
    model: import('../../types/uilib-table.js').UiTableModel | undefined;
    /** @type {import('../../types/uilib-table.js').UiTableIssue | undefined} */
    issue: import('../../types/uilib-table.js').UiTableIssue | undefined;
    disposed: boolean;
    /** @type {string[] | null | undefined} */
    lastFilteredIds: string[] | null | undefined;
    init$: {
        set_selection: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        set_sort: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        set_page: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        read_view: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        read_selection: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        previous_page: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        next_page: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        rows: never[];
        columns: never[];
        value: never[];
        filteredIds: null;
        sort: null;
        texts: {};
        page: number;
        unavailable: boolean;
        modelValid: boolean;
        selectionEnabled: boolean;
        headings: never[];
        bodyRows: never[];
        tableLabel: string;
        busyText: string;
        surfaceHidden: boolean;
        statusMessage: string;
        statusState: string;
        resultsLabel: string;
        selectedLabel: string;
        pageLabel: string;
        paginationLabel: string;
        previousLabel: string;
        nextLabel: string;
        totalCount: number;
        filteredCount: number;
        selectedCount: number;
        effectivePage: number;
        pageCount: number;
        paginationHidden: boolean;
        previousDisabled: boolean;
        nextDisabled: boolean;
        selectRow: (
        /** @type {string} */ id: string, 
        /** @type {boolean} */ selected: boolean) => {
            changed: boolean;
            selectedCount: number;
            filteredCount: number;
            page: number;
        };
        sortColumn: (/** @type {string} */ key: string) => {
            changed: boolean;
            selectedCount: number;
            filteredCount: number;
            page: number;
        };
        selectFiltered: () => {
            changed: boolean;
            selectedCount: number;
            filteredCount: number;
            page: number;
        };
    };
    constructor();
    renderCallback(): void;
    /** @returns {import('../../types/uilib-table.js').UiTableState} */
    stateInput(): import('../../types/uilib-table.js').UiTableState;
    refresh(): void;
    /** @param {string} key */
    text(key: string): string;
    requireModel(): import("../../types/uilib-table.js").UiTableModel;
    /**
     * @param {import('../../types/uilib-table.js').UiTableProperty} property
     * @param {unknown} value
     */
    edit(property: import('../../types/uilib-table.js').UiTableProperty, value: unknown): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
        page: number;
    };
    /**
     * @param {string} id
     * @param {boolean} selected
     */
    selectRow(id: string, selected: boolean): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
        page: number;
    };
    selectFiltered(): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
        page: number;
    };
    /** @param {string} key */
    sortColumn(key: string): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
        page: number;
    };
    destroyCallback(): void;
}
export declare namespace Table {
    export { TABLE_TEMPLATE as template };
    export { styles as rootStyles };
}
