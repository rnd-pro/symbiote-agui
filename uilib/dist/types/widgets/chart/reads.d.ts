/**
 * @param {import('./chart.js').Chart} chart
 * @param {boolean} selection
 * @param {number} [offset]
 * @param {number} [limit]
 */
export declare function readChart(chart: import('./chart.js').Chart, selection: boolean, offset?: number, limit?: number): {
    offset: number;
    nextOffset: number | null;
    totalCount: number;
    items: (string | {
        id: string;
        x?: string;
        values?: Record<string, string>;
        truncated?: boolean;
    })[];
};
