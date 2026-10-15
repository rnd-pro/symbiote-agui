import { compile } from '@tailwindcss/node';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let stylesheet = '';

export function getStyles() {
  return stylesheet;
}

/** @param {string} css */
export function publishStyles(css) {
  stylesheet = css;
}

/** @returns {Promise<import('../../types/markup.js').StyleCompiler>} */
export async function createStyles() {
  let source = new URL('../page/theme.css', import.meta.url);
  let compiler = await compile(await readFile(source, 'utf8'), {
    base: dirname(fileURLToPath(source)),
    onDependency() {},
  });
  publishStyles(compiler.build([]));
  return compiler;
}
