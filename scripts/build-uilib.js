import { appendFile, cp, mkdir, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CHART_RUNTIME_PATH } from '../uilib/widgets/chart/constants.js';
import { MAP_RUNTIME_PATH, MAP_CSS_PATH, MAP_ASSET_PREFIX } from '../uilib/widgets/map/constants.js';
import { DIAGRAM_RUNTIME_PATH } from '../uilib/widgets/diagram/constants.js';
import { MARKDOWN_RUNTIME_PATH, MARKDOWN_SANITIZER_PATH } from '../uilib/widgets/markdown/constants.js';

let root = new URL('../', import.meta.url);
let output = new URL('../uilib/dist/', import.meta.url);
// JSDA's single-file helper cannot split modules; reuse its installed toolchain.
let jsda = createRequire(import.meta.resolve('jsda-kit/cfg'));
let { build } = /** @type {typeof import('esbuild')} */ (await import(pathToFileURL(jsda.resolve('esbuild')).href));
let { minifyTemplates } = await import(pathToFileURL(jsda.resolve('esbuild-minify-templates')).href);

await rm(output, {
  recursive: true,
  force: true,
});
await mkdir(output, {
  recursive: true,
});
await import('./build-uilib-styles.js');

let result = await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: {
    index: 'uilib/browser.js',
    library: 'uilib/index.js',
    foundation: 'uilib/foundation.js',
    ...Object.fromEntries([
      CHART_RUNTIME_PATH,
      MAP_RUNTIME_PATH,
      DIAGRAM_RUNTIME_PATH,
      MARKDOWN_RUNTIME_PATH,
      MARKDOWN_SANITIZER_PATH,
    ].map((path) => [
      path.replace(/\.js$/, ''),
      `uilib/${path}`,
    ])),
  },
  outdir: fileURLToPath(output),
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  chunkNames: 'shared/[name]-[hash]',
  minify: true,
  metafile: true,
  plugins: [
    minifyTemplates({
      taggedOnly: true,
    }),
  ],
});
for (let path of Object.keys(result.metafile.inputs)) {
  if (path.startsWith('src/') || path.startsWith('node:')) {
    throw new Error(`Non-library module in browser distribution: ${path}`);
  }
}
let runtimes = Object.keys(result.metafile.inputs).filter((path) =>
  path.includes('@symbiotejs/symbiote/') && path.endsWith('/core/Symbiote.js'));
if (runtimes.length !== 1) { throw new Error('The browser graph must contain one Symbiote runtime.'); }
for (let module of Object.values(result.metafile.outputs)) {
  if (module.imports.some((dependency) => dependency.external)) {
    throw new Error('The browser graph contains an unresolved external module.');
  }
}
await cp(new URL('../node_modules/leaflet/dist/leaflet.css', import.meta.url), new URL(MAP_CSS_PATH, output));
await cp(new URL('../node_modules/leaflet/dist/images/', import.meta.url), new URL(MAP_ASSET_PREFIX, output), {
  recursive: true,
});
await promisify(execFile)(process.execPath, [
  fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)),
  '--project',
  'tsconfig.uilib.json',
], {
  cwd: fileURLToPath(root),
});
await cp(new URL('../uilib/types/', import.meta.url), new URL('types/types/', output), {
  recursive: true,
});
let models = (await readdir(new URL('../uilib/types/', import.meta.url)))
  .filter((name) => name === 'components.d.ts' || name.startsWith('uilib'))
  .sort();
await appendFile(new URL('types/index.d.ts', output), models.map((name) =>
  `export type * from './types/${name.replace(/\.d\.ts$/, '.js')}';\n`).join(''));
process.stderr.write(`Built ${Object.keys(result.metafile.outputs).length} browser modules and library declarations.\n`);
