import { compile } from '@tailwindcss/node';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { analyzeFragment } from './fragment.js';
import { UILIB_TEMPLATES } from '../page/client/uilib/templates.js';

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

/** @returns {Promise<import('../../types/markup.js').StyleCompiler>} */
export async function createStyles() {
  let compiler = await compileStyles(new URL('../page/theme.css', import.meta.url));
  let { document } = parseHTML('');
  let template = document.createElement('template');
  template.innerHTML = Object.values(UILIB_TEMPLATES).join('\n');
  publishStyles(compiler.build(analyzeFragment(template.content).classes));
  return compiler;
}
