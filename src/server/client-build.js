import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { libraryEntry } from './library.js';

/** @param {string} entry */
export async function buildClient(entry) {
  let jsda = createRequire(import.meta.resolve('jsda-kit/cfg'));
  let { build } = /** @type {typeof import('esbuild')} */ (await import(pathToFileURL(jsda.resolve('esbuild')).href));
  let base = libraryEntry().replace(/library\.js$/, '');
  let library = fileURLToPath(new URL('../../uilib/', import.meta.url));
  let symbiote = dirname(dirname(fileURLToPath(import.meta.resolve('@symbiotejs/symbiote'))));
  let config = fileURLToPath(new URL('../page/client/library-base.js', import.meta.url));
  let result = await build({
    entryPoints: [
      entry,
    ],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    write: false,
    plugins: [
      {
        name: 'shared-uilib',
        setup(builder) {
          builder.onResolve({
            filter: /.*/,
          }, (args) => {
            let path;
            let prefix = '';
            if (args.path.startsWith('@symbiotejs/symbiote')) {
              path = fileURLToPath(import.meta.resolve(args.path));
              prefix = 'symbiote/';
            } else if (args.path.startsWith('.') && args.importer) {
              path = resolve(dirname(args.importer), args.path);
              if (!path.startsWith(library)) { return; }
            } else { return; }
            let name = relative(prefix ? symbiote : library, path).replaceAll('\\', '/');
            if (!prefix && name === 'index.js') { name = 'library.js'; }
            return {
              path: `${base}${prefix}${name}`,
              external: true,
            };
          });
          builder.onLoad({
            filter: /library-base\.js$/,
          }, (args) => args.path === config ? {
            contents: `export let libraryBase = ${JSON.stringify(base)};`,
          } : undefined);
        },
      },
    ],
  });
  return result.outputFiles[0].text;
}
