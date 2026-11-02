import { md2html } from 'jsda-kit/iso/md2html.js';
import { MARKDOWN_LIMITS } from '../constants.js';
import { markdownFragment } from './sanitize.js';

/** @param {string} source */
export async function markdownHtml(source) {
  if (new TextEncoder().encode(source).byteLength > MARKDOWN_LIMITS.inputBytes) { throw new Error('inputTooLarge'); }
  let html = await md2html(source);
  if (new TextEncoder().encode(html).byteLength > MARKDOWN_LIMITS.outputBytes) { throw new Error('outputTooLarge'); }
  return html;
}

/**
 * @param {string} source
 * @param {string} headingPrefix
 * @param {string} [baseUrl]
 * @param {boolean} [extensions]
 */
export async function renderMarkdown(source, headingPrefix, baseUrl = document.baseURI, extensions = true) {
  return markdownFragment(await markdownHtml(source), headingPrefix, baseUrl, extensions);
}

/**
 * Render inert source with JSDA's highlighter, independently of document limits.
 * @param {string} source
 * @param {string} language
 * @param {number} inputBytes
 */
export async function renderCode(source, language, inputBytes) {
  if (!/^[\w+-]+$/.test(language)) { throw new Error('invalidLanguage'); }
  if (new TextEncoder().encode(source).byteLength > inputBytes) { throw new Error('inputTooLarge'); }
  let length = 3;
  for (let match of source.matchAll(/`+/g)) { length = Math.max(length, match[0].length + 1); }
  let fence = '`'.repeat(length);
  let html = await md2html(`${fence}${language}\n${source}\n${fence}`);
  let limits = {
    ...MARKDOWN_LIMITS,
    inputBytes,
    outputBytes: inputBytes * 32,
    nodes: inputBytes,
  };
  if (new TextEncoder().encode(html).byteLength > limits.outputBytes) { throw new Error('outputTooLarge'); }
  let fragment = await markdownFragment(html, 'source', document.baseURI, false, limits);
  let code = fragment.querySelector('pre code');
  let normalized = source.replace(/\r\n?/g, '\n');
  if (!code || (code.textContent !== normalized && code.textContent !== `${normalized}\n`)) { throw new Error('sourceChanged'); }
  // Markdown normalizes line endings and appends a newline. Restore the exact
  // original text without losing the sanitized token spans.
  let walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  let offset = 0;
  while (walker.nextNode()) {
    let text = walker.currentNode;
    let start = offset;
    for (let character of text.textContent || '') {
      offset += character === '\n' && source.slice(offset, offset + 2) === '\r\n' ? 2 : character.length;
    }
    text.textContent = source.slice(start, offset);
  }
  if (code.textContent !== source) { throw new Error('sourceChanged'); }
  return code;
}
