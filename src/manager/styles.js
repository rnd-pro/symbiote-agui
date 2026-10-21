import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { analyzeFragment } from '../markup/fragment.js';
import { compileStyles } from '../markup/styles.js';

export async function createManagerStyles() {
  let [compiler, html] = await Promise.all([
    compileStyles(new URL('./page/styles.css', import.meta.url)),
    readFile(new URL('./page/index.html', import.meta.url), 'utf8'),
  ]);
  let { document } = parseHTML(html);
  let fragment = document.createDocumentFragment();
  fragment.append(document.body);
  return compiler.build(analyzeFragment(fragment).classes);
}
