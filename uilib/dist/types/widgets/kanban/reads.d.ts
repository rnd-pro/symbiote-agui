/**
 * @param {import('./kanban.js').Kanban} board
 * @param {string} [status]
 * @param {number} [offset]
 * @param {number} [limit]
 */
export declare function readKanban(board: import('./kanban.js').Kanban, status?: string, offset?: number, limit?: number): {
    offset: number;
    nextOffset: number | null;
    totalCount: number;
    matchingCount: number;
    items: {
        id: string;
        title?: string;
        description?: string;
        status?: string | null;
        unassigned?: boolean;
        truncated?: boolean;
    }[];
};
