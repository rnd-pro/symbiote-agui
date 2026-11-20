import { compile } from '@tailwindcss/node';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { analyzeFragment } from './fragment.js';
import { analyzeMarkup } from './analyze.js';
import { UILIB_TEMPLATES, UILIB_STATE_CLASSES } from '../../uilib/templates.js';
import { PAGE_TEMPLATES } from '../page/client/templates.js';

let stylesheet = '';

export function getStyles() {
  return stylesheet;
}

/** @param {string} css */
export function publishStyles(css) {
  stylesheet = css;
}

/** @param {URL} source */
export async function compileStyles(source) {
  return compile(await readFile(source, 'utf8'), {
    base: dirname(fileURLToPath(source)),
    onDependency() {},
  });
}

/**
 * Compile utilities used by owned HTML chunks, without global page styles.
 * @param {string[]} fragments
 */
export async function compileUtilities(fragments) {
  let compiler = await compile('@reference "./theme.css";\n@layer utilities { @tailwind utilities; }', {
    base: fileURLToPath(new URL('../../uilib/', import.meta.url)),
    onDependency() {},
  });
  let classes = new Set(fragments.flatMap((html) => analyzeMarkup(html).classes));
  return compiler.build([
    ...classes,
  ]);
}

/** @returns {Promise<import('../../types/markup.js').StyleCompiler>} */
export async function createStyles() {
  let compiler = await compileStyles(new URL('../../uilib/theme.css', import.meta.url));
  let { document } = parseHTML('');
  let template = document.createElement('template');
  template.innerHTML = [
    ...Object.values(UILIB_TEMPLATES),
    ...Object.values(PAGE_TEMPLATES),
  ].join('\n');
  publishStyles(compiler.build([
    ...UILIB_STATE_CLASSES,
    ...analyzeFragment(template.content).classes,
  ]));
  return compiler;
}
