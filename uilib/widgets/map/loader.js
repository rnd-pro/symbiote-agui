import { MAP_RUNTIME_PATH, MAP_CSS_PATH, MAP_ASSET_PREFIX } from './constants.js';
import { libraryAssetUrl } from '../../shared/assets.js';

/** @type {Promise<typeof import('./runtime/index.js')> | undefined} */
let pending;

export function loadMapRuntime() {
  let url = libraryAssetUrl(MAP_RUNTIME_PATH);
  // Keep the large adapter outside the entry bundle, and mirror CSS via the
  // same adopted stylesheet mechanism as the rest of the UI library.
  pending ??= Promise.all([
    /** @type {Promise<typeof import('./runtime/index.js')>} */ (import(url)),
    fetch(libraryAssetUrl(MAP_CSS_PATH)).then(async (response) => {
      if (!response.ok) { throw new Error(); }
      let sheet = new CSSStyleSheet();
      let css = (await response.text()).replaceAll('url(images/', `url(${libraryAssetUrl(MAP_ASSET_PREFIX)}`);
      sheet.replaceSync(`@layer base { ${css} }`);
      document.adoptedStyleSheets = [
        ...document.adoptedStyleSheets,
        sheet,
      ];
    }),
  ]).then(([
    runtime,
  ]) => runtime);
  return pending;
}
