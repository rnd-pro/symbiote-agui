import { DIAGRAM_RUNTIME_PATH } from './constants.js';

/** @type {Promise<typeof import('./runtime/index.js')> | undefined} */
let pending;

export function loadDiagramRuntime() {
  // Keep Pele and SVG sanitization outside the normal page/manager bundle.
  let url = DIAGRAM_RUNTIME_PATH;
  pending ??= /** @type {Promise<typeof import('./runtime/index.js')>} */ (import(url));
  return pending;
}
