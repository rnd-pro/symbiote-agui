import { DATA_LIMITS } from '../../shared/data/constants.js';
import { nonempty, record, validateRows, validateIds } from '../../shared/data/validate.js';
import { MAP_LIMITS } from './constants.js';

/** @param {unknown} value */
export function validLatitude(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAP_LIMITS.latitude;
}

/** @param {unknown} value */
export function validLongitude(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 180;
}

/** @param {import('../../../../../../types/uilib-map.js').UiMapView} view */
export function validateView(view) {
  if (!record(view) || !Array.isArray(view.center) || view.center.length !== 2
    || !validLatitude(view.center[0]) || !validLongitude(view.center[1])
    || !Number.isInteger(view.zoom) || view.zoom < 0 || view.zoom > MAP_LIMITS.zoom) { throw new Error('invalidState'); }
}

/** @param {string} value */
function safeUrl(value) {
  try {
    let url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

/** @param {import('../../../../../../types/uilib-map.js').UiMapTiles | null} tiles */
export function validateTiles(tiles) {
  if (tiles === null) { return; }
  if (!record(tiles) || !nonempty(tiles.url, 2048) || !safeUrl(tiles.url)
    || !nonempty(tiles.attribution, DATA_LIMITS.text)
    || tiles.attributionUrl !== undefined && !safeUrl(tiles.attributionUrl)
    || ![
      '{z}',
      '{x}',
      '{y}',
    ].every((token) => tiles.url.includes(token))
    || /[{}]/.test(tiles.url.replace(/\{[zxy]\}/g, ''))
    || !Number.isInteger(tiles.minZoom ?? 0) || !Number.isInteger(tiles.maxZoom ?? 19)
    || (tiles.minZoom ?? 0) < 0 || (tiles.maxZoom ?? 19) > MAP_LIMITS.zoom
    || (tiles.minZoom ?? 0) > (tiles.maxZoom ?? 19)) { throw new Error('invalidTiles'); }
}

/** @param {import('../../../../../../types/uilib-map.js').UiMapState} state
 * @returns {import('../../../../../../types/uilib-map.js').UiMapModel}
 */
export function deriveMap(state) {
  validateRows(state.rows, state.idKey);
  validateIds(state.value);
  validateView(state.view);
  validateTiles(state.tiles);
  if (state.rows.length > MAP_LIMITS.rows) { throw new Error('invalidRows'); }
  if (![
    'none',
    'single',
    'multiple',
  ].includes(state.selection) || ![
    state.latitudeKey,
    state.longitudeKey,
    state.labelKey,
  ].every((key) => nonempty(key, DATA_LIMITS.key))) { throw new Error('invalidState'); }
  let points = state.rows.filter((row) => validLatitude(row[state.latitudeKey]) && validLongitude(row[state.longitudeKey])).map((row) => ({
    id: String(row[state.idKey]),
    label: String(row[state.labelKey] ?? row[state.idKey]),
    latitude: /** @type {number} */ (row[state.latitudeKey]),
    longitude: /** @type {number} */ (row[state.longitudeKey]),
  }));
  let available = new Set(points.map((point) => point.id));
  let selected = state.selection === 'none' ? [] : state.value.filter((id) => available.has(id));
  return {
    state,
    points,
    selected: state.selection === 'single' ? selected.slice(0, 1) : selected,
    skippedCount: state.rows.length - points.length,
  };
}

/** @param {import('../../../../../../types/uilib-map.js').UiMapModel} model
 * @param {string[]} ids
 */
export function selectedMapIds(model, ids) {
  validateIds(ids);
  let available = new Set(model.points.map((point) => point.id));
  if (model.state.selection === 'none' || model.state.selection === 'single' && ids.length > 1
    || ids.some((id) => !available.has(id))) { throw new Error('invalidState'); }
  return ids.slice();
}
