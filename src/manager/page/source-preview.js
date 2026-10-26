import { loadMarkdownRuntime } from '../../page/client/uilib/widgets/markdown/loader.js';
import { EXPLORER_PREVIEW_BYTES } from '../../projects/explorer/constants.js';

let languages = {
  html: 'html',
  htm: 'html',
  svg: 'xml',
  xml: 'xml',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  jsonl: 'json',
  css: 'css',
  scss: 'scss',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  sql: 'sql',
  sh: 'bash',
  py: 'python',
  go: 'go',
  rs: 'rust',
  vue: 'html',
  svelte: 'html',
};

/**
 * @param {HTMLElement} code
 * @param {string} source
 * @param {string} path
 * @param {() => boolean} current
 */
export async function highlightSourcePreview(code, source, path, current) {
  let extension = path.split('.').pop()?.toLowerCase() || '';
  let language = languages[/** @type {keyof typeof languages} */ (extension)];
  if (!language) { return; }
  try {
    let runtime = await loadMarkdownRuntime();
    let highlighted = await runtime.renderCode(source, language, EXPLORER_PREVIEW_BYTES);
    if (!current()) { return; }
    code.replaceChildren(...highlighted.childNodes);
  } catch {
    // Keep the original source readable if loading or highlighting fails.
  }
}
