import { MARKDOWN_RUNTIME_PATH } from './constants.js';
import { libraryAssetUrl } from '../../shared/assets.js';

/** @type {Promise<typeof import('./runtime/index.js')> | undefined} */
let pending;

export function loadMarkdownRuntime() {
  let url = libraryAssetUrl(MARKDOWN_RUNTIME_PATH);
  pending ??= /** @type {Promise<typeof import('./runtime/index.js')>} */ (import(url)).then((runtime) => {
    runtime.setLibraryAssetBase(libraryAssetUrl('./'));
    return runtime;
  });
  return pending;
}
