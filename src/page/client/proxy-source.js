import { PROXY_PATH, PROXY_SOURCE_HEADER } from '../../proxy/constants.js';

/**
 * @param {string} requestedUrl
 * @param {Response} response
 * @param {string | undefined} pageUrl
 */
export function proxySourceUrl(requestedUrl, response, pageUrl) {
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

