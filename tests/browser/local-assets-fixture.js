import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { reserveSession } from '../../src/sessions/store.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { definitionPaths } from '../../src/library/paths.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import fontData from '../../src/uilib/content/icon/font-data.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelProxy } from './tunnel-proxy.js';

/** @param {import('node:test').TestContext} t */
export async function localAssetsFixture(t) {
  let state = await temporaryState();
  let tunnel = await tunnelProxy();
  let record = await reserveSession('local-assets');
  let runtime = new SessionRuntime(record);
  t.after(async () => {
    await runtime.close();
    await tunnel.close();
    await state.close();
  });
  let gallery = await readFile(new URL('../../src/uilib/gallery.html', import.meta.url), 'utf8');
  let {
    document,
  } = parseHTML('');
  let template = document.createElement('template');
  template.innerHTML = gallery;
  let panel = template.content.querySelector('#gallery-local-assets');
  let data = template.content.querySelector('#gallery-data > script[type="application/json"]')?.textContent;
  if (!panel || !data) { throw new Error('The gallery local asset example is missing.'); }
  let markup = `<context-provider ctx="APP"><script type="application/json">${JSON.stringify({
    markdownTexts: JSON.parse(data).markdownTexts,
  })}</script>${panel.outerHTML}</context-provider>
    <link rel="stylesheet" href="./_assets/styles/main.css">
    <link rel="preload" as="script" href="./_assets/modules/main.mjs">
    <div id="css-asset">CSS image</div>
    <span id="font-asset">home</span>
    <img id="svg-asset" src="./_assets/marker.svg" alt="SVG test marker" width="8" height="8">
    <picture><source srcset="./_assets/agui.png 1x"><img id="picture-asset" src="./_assets/agui.png" alt="Responsive image" width="96" height="54"></picture>
    <output id="module-result"></output>
    <script type="module" data-agui>
      export default async (root) => {
        let module = await import(new URL('./_assets/modules/main.mjs', document.baseURI).href);
        return module.mount(root);
      };
    </script>`;
  let pending = await prepareCachedMarkup(record.sessionId, markup);
  try { await pending.commit(); }
  finally { await pending.discard(); }
  let root = definitionPaths(record.sessionId).assetsPath;
  await cp(new URL('../../src/uilib/gallery.assets/', import.meta.url), root, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  for (let directory of [
    'styles',
    'fonts',
    'modules',
  ]) { await mkdir(join(root, directory)); }
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">
    <style>.marker { fill: rgb(21, 128, 61); }</style><rect class="marker" width="8" height="8"/>
    <script>document.documentElement.setAttribute('data-executed', 'yes'); parent.postMessage('asset-svg-executed', '*');</script>
  </svg>`;
  let files = {
    'marker.svg': svg,
    'fonts/icons.woff2': Buffer.from(fontData.split(',')[1], 'base64'),
    'styles/main.css': '@import url("./base.css");',
    'styles/base.css': `@font-face {
      font-family: AssetFixture;
      src: url('../fonts/icons.woff2') format('woff2');
      font-display: swap;
    }
    #font-asset {
      font-family: AssetFixture, sans-serif;
    }
    #css-asset {
      --asset-loaded: yes;
      background-image: url('../marker.svg');
    }`,
    'modules/piece.html.js': `if (typeof window === 'undefined') { throw new Error('Browser module executed on host'); }
      export let label = 'Loaded local module';`,
    'modules/records.json': '{"count":3}',
    'modules/main.mjs': `import { label } from './piece.html.js';
      export async function mount(root) {
        let response = await fetch(new URL('./records.json', import.meta.url));
        let data = await response.json();
        root.querySelector('#module-result').textContent = label + ': ' + data.count;
        window.assetModuleRuns = (window.assetModuleRuns || 0) + 1;
      }`,
  };
  for (let [
    path,
    bytes,
  ] of Object.entries(files)) { await writeFile(join(root, path), bytes); }
  await runtime.start(new AbortController().signal);
  if (!runtime.access || !runtime.pages || !record.url) { throw new Error('Local asset fixture did not initialize.'); }
  runtime.access.sharing = true;
  runtime.access.publicOrigin = tunnel.origin;
  runtime.pages.shared.enable(runtime.revision);
  tunnel.setTarget(record.url);
  return {
    runtime,
    root,
    svg,
    localUrl: record.url,
    publicUrl: `${tunnel.origin}${runtime.access.path}`,
    viewerUrl: `${tunnel.origin}${runtime.access.path}?mode=viewer`,
  };
}
