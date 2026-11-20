import { List } from '../list/list.js';
import styles from '../list/styles.js';
export declare class Explorer extends List {
    /** @type {HTMLTemplateElement | undefined} */
    defaultTemplate: HTMLTemplateElement | undefined;
    constructor();
    resolveTemplate(): HTMLTemplateElement;
    renderCallback(): void;
    get selectsBranches(): boolean;
    stateInput(): {
        rows: import("../../types/uilib-data.js").UiDataRecord[];
        value: string[];
        filteredIds: string[] | null;
        label: string;
        texts: import("../../types/uilib.js").UiTexts;
        disabled: boolean;
        readonly: boolean;
        loading: boolean;
        error: string;
        idKey: string;
        selection: import('../../types/uilib-data.js').UiDataSelection;
    };
    /** @param {import('../../types/uilib-list.js').UiListState} state */
    deriveModel(state: import('../../types/uilib-list.js').UiListState): import("../../types/uilib-list.js").UiListModel;
    /** @param {string[]} ids */
    edit(ids: string[]): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
    };
    /** @param {string} id */
    toggleNode(id: string): {
        id: string;
        expanded: boolean;
        changed: boolean;
    };
    /**
     * @param {string} id
     * @param {import('../../types/uilib-explorer.js').UiExplorerRequest['action']} action
     */
    requestNode(id: string, action: import('../../types/uilib-explorer.js').UiExplorerRequest['action']): void;
}
export declare namespace Explorer {
    export { styles as rootStyles };
}
