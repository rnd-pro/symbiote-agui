/**
 * @param {import('./map.js').AguiMap} map
 * @param {number} [offset]
 * @param {number} [limit]
 */
export declare function readMap(map: import('./map.js').AguiMap, offset?: number, limit?: number): {
    view: import("../../types/uilib-map.js").UiMapView;
    selectedCount: number;
    skippedCount: number;
    totalCount: number;
    offset: number;
    items: string[];
    nextOffset: number | null;
};
