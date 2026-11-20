import { Table } from '../widgets/table/table.js';
export declare class SelectionTable extends Table {
    /**
     * @param {import('../types/uilib-table.js').UiTableProperty} property
     * @param {unknown} value
     */
    edit(property: import('../types/uilib-table.js').UiTableProperty, value: unknown): {
        changed: boolean;
        selectedCount: number;
        filteredCount: number;
        page: number;
    };
}
