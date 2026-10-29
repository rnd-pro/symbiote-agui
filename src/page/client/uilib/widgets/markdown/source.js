import { MARKDOWN_LIMITS } from './constants.js';
import { PROXY_PATH, PROXY_SOURCE_HEADER } from '../../../../../proxy/constants.js';

/**
 * @param {string} source
 * @param {string} base
 */
export function markdownSourceUrl(source, base) {
  try {
    let url = new URL(source, base);
    if (![
      'https:',
      'http:',
    ].includes(url.protocol) || url.username || url.password) { throw new Error(); }
    url.hash = '';
    return url.href;
  } catch { throw new Error('invalidSrc'); }
}

/**
 * @param {string} requestedUrl
 * @param {Response} response
 * @param {string | undefined} pageUrl
 */
function markdownResponseUrl(requestedUrl, response, pageUrl) {
  let actual = response.url || requestedUrl;
  if (!pageUrl) { return actual; }
  let page = new URL(pageUrl);
  let requested = new URL(requestedUrl);
  let endpoint = new URL(PROXY_PATH, page);
  if (requested.origin !== page.origin || requested.pathname !== endpoint.pathname) { return actual; }
  try {
    if (response.redirected || new URL(actual).href !== requested.href
      || requested.searchParams.getAll('url').length !== 1 || [
        ...requested.searchParams.keys(),
      ].some((key) => key !== 'url')) { throw new Error(); }
    let source = response.headers.get(PROXY_SOURCE_HEADER) || '';
    if (/[\x00-\x20\x7f\\]/.test(source)) { throw new Error(); }
    let url = new URL(source);
    if (![
      'http:',
      'https:',
    ].includes(url.protocol) || url.username || url.password || url.hash) { throw new Error(); }
    return url.href;
  } catch { throw new Error('fetchFailed'); }
}

/**
 * @param {string} url
 * @param {AbortSignal} signal
 * @param {string} [pageUrl]
 */
export async function fetchMarkdownSource(url, signal, pageUrl) {
  let response = await fetch(url, {
    signal: AbortSignal.any([
      signal,
      AbortSignal.timeout(MARKDOWN_LIMITS.fetchTimeoutMs),
    ]),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    mode: 'cors',
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('fetchFailed'); }
  if (Number(response.headers.get('content-length')) > MARKDOWN_LIMITS.inputBytes) {
    await response.body?.cancel();
    throw new Error('inputTooLarge');
  }
  let sourceUrl;
  try { sourceUrl = markdownResponseUrl(url, response, pageUrl); }
  catch (error) { await response.body?.cancel(); throw error; }
  if (!response.body) {
    return {
      text: '',
      url: sourceUrl,
    };
  }
  let reader = response.body.getReader();
  let decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      let chunk = await reader.read();
      if (chunk.done) {
        return {
          text: text + decoder.decode(),
          url: sourceUrl,
        };
      }
      bytes += chunk.value.byteLength;
      if (bytes > MARKDOWN_LIMITS.inputBytes) { await reader.cancel(); throw new Error('inputTooLarge'); }
      text += decoder.decode(chunk.value, {
        stream: true,
      });
    }
  } finally { reader.releaseLock(); }
}
