/** @param {unknown} value */
export declare function validLatitude(value: unknown): boolean;
/** @param {unknown} value */
export declare function validLongitude(value: unknown): boolean;
/** @param {import('../../types/uilib-map.js').UiMapView} view */
export declare function validateView(view: import('../../types/uilib-map.js').UiMapView): void;
/** @param {import('../../types/uilib-map.js').UiMapTiles | null} tiles */
export declare function validateTiles(tiles: import('../../types/uilib-map.js').UiMapTiles | null): void;
/** @param {import('../../types/uilib-map.js').UiMapState} state
 * @returns {import('../../types/uilib-map.js').UiMapModel}
 */
export declare function deriveMap(state: import('../../types/uilib-map.js').UiMapState): import('../../types/uilib-map.js').UiMapModel;
/** @param {import('../../types/uilib-map.js').UiMapModel} model
 * @param {string[]} ids
 */
export declare function selectedMapIds(model: import('../../types/uilib-map.js').UiMapModel, ids: string[]): string[];
