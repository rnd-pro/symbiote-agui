import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { analyzeFragment } from '../markup/fragment.js';
import { compileStyles } from '../markup/styles.js';
import { cssMin } from 'jsda-kit/node/cssMin.js';
import { UILIB_TEMPLATES } from '../page/client/uilib/templates.js';
import { SESSION_ROW_TEMPLATE } from './page/row-template.js';

export async function createManagerStyles() {
  let [compiler, html] = await Promise.all([
    compileStyles(new URL('./page/styles.css', import.meta.url)),
    readFile(new URL('./page/index.html', import.meta.url), 'utf8'),
  ]);
  let { document } = parseHTML(html);
  let fragment = document.createDocumentFragment();
  let templates = document.createElement('template');
  templates.innerHTML = [...Object.values(UILIB_TEMPLATES), SESSION_ROW_TEMPLATE].join('\n');
  fragment.append(document.body, templates.content);
  return cssMin(compiler.build(analyzeFragment(fragment).classes));
}
