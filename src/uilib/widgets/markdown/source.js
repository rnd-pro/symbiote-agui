import { MARKDOWN_LIMITS } from './constants.js';
import { fetchTextSource } from '../../shared/source.js';

export { sourceUrl as markdownSourceUrl } from '../../shared/source.js';

/**
 * @param {string} url
 * @param {AbortSignal} signal
 * @param {string} [pageUrl]
 */
export function fetchMarkdownSource(url, signal, pageUrl) {
  return fetchTextSource(url, signal, MARKDOWN_LIMITS, pageUrl);
}
