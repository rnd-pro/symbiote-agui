/**
 * @param {import('../../types/uilib-explorer.js').UiExplorerNode[]} items
 * @param {string[]} expanded
 */
export declare function deriveExplorer(items: import('../../types/uilib-explorer.js').UiExplorerNode[], expanded: string[]): (import("../../types/uilib-data.js").UiDataRecord & {
    id: string;
    label: string;
    parentId?: string;
    branch?: boolean;
    loaded?: boolean;
    loading?: boolean;
    more?: boolean;
    disabled?: boolean;
    icon?: string;
    message?: string;
} & {
    depth: number;
    visible: boolean;
    open: boolean;
})[];
