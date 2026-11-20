import { CHART_RUNTIME_PATH } from './constants.js';
import { libraryAssetUrl } from '../../shared/assets.js';

/** @type {Promise<typeof import('./runtime/index.js')> | undefined} */
let pending;

export function loadChartRuntime() {
  // A URL variable keeps JSDA's entry bundler from inlining the heavy adapter.
  let url = libraryAssetUrl(CHART_RUNTIME_PATH);
  pending ??= /** @type {Promise<typeof import('./runtime/index.js')>} */ (import(url));
  return pending;
}
