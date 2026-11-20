import { UiComponent } from '../../shared/component.js';
import { FILTER_TEMPLATE } from './template.js';
import styles from './styles.js';
export declare class Filter extends UiComponent {
    componentDescription: () => string;
    /** @type {import('../../types/uilib-filter.js').UiFilterModel | undefined} */
    model: import('../../types/uilib-filter.js').UiFilterModel | undefined;
    /** @type {import('../../types/uilib-filter.js').UiFilterIssue | undefined} */
    issue: import('../../types/uilib-filter.js').UiFilterIssue | undefined;
    disposed: boolean;
    init$: {
        set_value: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        set_query: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        read_result: import("@symbiotejs/symbiote/webmcp").ToolDescriptor;
        rows: never[];
        fields: never[];
        value: {};
        query: string;
        texts: {};
        unavailable: boolean;
        modelValid: boolean;
        resultIds: never[];
        fieldItems: never[];
        queryLabel: string;
        queryText: string;
        statusMessage: string;
        statusState: string;
        editField: (
        /** @type {string} */ key: string, 
        /** @type {unknown} */ value: unknown) => {
            changed: boolean;
            resultCount: number;
        };
    };
    constructor();
    renderCallback(): void;
    /** @returns {import('../../types/uilib-filter.js').UiFilterState} */
    stateInput(): import('../../types/uilib-filter.js').UiFilterState;
    refresh(): void;
    /** @param {string} key */
    text(key: string): string;
    requireModel(): import("../../types/uilib-filter.js").UiFilterModel;
    /**
     * @param {'value' | 'query'} property
     * @param {unknown} value
     */
    edit(property: 'value' | 'query', value: unknown): {
        changed: boolean;
        resultCount: number;
    };
    /**
     * @param {string} key
     * @param {unknown} value
     */
    editField(key: string, value: unknown): {
        changed: boolean;
        resultCount: number;
    };
    /**
     * @param {number} [offset]
     * @param {number} [limit]
     */
    readResult(offset?: number, limit?: number): {
        total: number;
        items: string[];
        nextOffset: number | null;
    };
    destroyCallback(): void;
}
export declare namespace Filter {
    export { FILTER_TEMPLATE as template };
    export { styles as rootStyles };
}
