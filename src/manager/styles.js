import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { analyzeFragment } from '../markup/fragment.js';
import { compileStyles } from '../markup/styles.js';
import { cssMin } from 'jsda-kit/node/cssMin.js';
import { UILIB_TEMPLATES, UILIB_STATE_CLASSES } from '../../uilib/templates.js';
import { SESSION_CONTROLS_TEMPLATE } from './page/controls-template.js';
import { CONNECTIONS_TEMPLATE } from './page/connections-template.js';
import { CONNECTOR_SETTINGS_TEMPLATE } from './page/connectors-template.js';
import { MANAGER_SECTIONS } from './sections.js';

export async function createManagerStyles() {
  let [
    compiler,
    html,
    sections,
  ] = await Promise.all([
    compileStyles(new URL('./page/styles.css', import.meta.url)),
    readFile(new URL('./page/index.html', import.meta.url), 'utf8'),
    Promise.all(Object.values(MANAGER_SECTIONS).map((file) => readFile(file, 'utf8'))),
  ]);
  let { document } = parseHTML(html);
  let fragment = document.createDocumentFragment();
  let templates = document.createElement('template');
  templates.innerHTML = [
    ...Object.values(UILIB_TEMPLATES),
    SESSION_CONTROLS_TEMPLATE,
    CONNECTIONS_TEMPLATE,
    CONNECTOR_SETTINGS_TEMPLATE,
    ...sections,
  ].join('\n');
  fragment.append(document.body, templates.content);
  return cssMin(compiler.build([
    ...UILIB_STATE_CLASSES,
    ...analyzeFragment(fragment).classes,
  ]));
}
