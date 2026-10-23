import { MARKDOWN_LIMITS } from './constants.js';

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
 * @param {string} url
 * @param {AbortSignal} signal
 */
export async function fetchMarkdownSource(url, signal) {
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
  let sourceUrl = response.url || url;
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
