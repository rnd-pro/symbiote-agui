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
 */
export async function renderMarkdown(source, headingPrefix, baseUrl = document.baseURI) {
  return markdownFragment(await markdownHtml(source), headingPrefix, baseUrl);
}
