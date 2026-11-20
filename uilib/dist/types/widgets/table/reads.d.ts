/**
 * @param {import('./table.js').Table} table
 * @param {boolean} selection
 * @param {number} [offset]
 * @param {number} [limit]
 */
export declare function readTable(table: import('./table.js').Table, selection: boolean, offset?: number, limit?: number): {
    offset: number;
    nextOffset: number | null;
    page: number;
    pageCount: number;
    totalCount: number;
    filteredCount: number;
    selectedCount: number;
    items: (string | {
        id: string;
        selected: boolean;
        cells?: Record<string, string>;
        truncated?: boolean;
    })[];
};
