import { MARKDOWN_RUNTIME_PATH } from './constants.js';

/** @type {Promise<typeof import('./runtime/index.js')> | undefined} */
let pending;

export function loadMarkdownRuntime() {
  let url = MARKDOWN_RUNTIME_PATH;
  pending ??= /** @type {Promise<typeof import('./runtime/index.js')>} */ (import(url));
  return pending;
}
