import { MAP_RUNTIME_PATH, MAP_CSS_PATH } from './constants.js';

/** @type {Promise<typeof import('./runtime/index.js')> | undefined} */
let pending;

export function loadMapRuntime() {
  let url = MAP_RUNTIME_PATH;
  // Keep the large adapter outside the entry bundle, and mirror CSS via the
  // same adopted stylesheet mechanism as the rest of the UI library.
  pending ??= Promise.all([
    /** @type {Promise<typeof import('./runtime/index.js')>} */ (import(url)),
    fetch(MAP_CSS_PATH).then(async (response) => {
      if (!response.ok) { throw new Error(); }
      let sheet = new CSSStyleSheet();
      sheet.replaceSync(`@layer base { ${await response.text()} }`);
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
