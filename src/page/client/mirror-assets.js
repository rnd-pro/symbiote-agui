import { ASSET_PATH } from '../../assets/constants.js';

/**
 * Keep published resources on the viewer's origin, including when the user is
 * local and the viewer is public. Other origins remain unchanged.
 * @param {HTMLElement} root
 */
export function mirrorAssets(root) {
  let prefix = new URL(`./${ASSET_PATH}/`, location.href);
  /** @param {string} value */
  let publishedUrl = (value) => {
    try {
      let url = new URL(value, document.baseURI);
      if (url.origin === prefix.origin && !url.username && !url.password && url.pathname.startsWith(prefix.pathname)) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch { /* Invalid URLs are left to the browser's normal resource handling. */ }
  };
  for (let link of root.querySelectorAll('link')) {
    let url = publishedUrl(link.getAttribute('href') || '');
    if (link.getAttribute('rel')?.trim().toLowerCase() === 'stylesheet' && url) {
      link.setAttribute('href', url);
    } else { link.remove(); }
  }
  for (let element of root.querySelectorAll('[src], [poster], [srcset]')) {
    for (let name of [
      'src',
      'poster',
    ]) {
      let value = element.getAttribute(name);
      let url = value && publishedUrl(value);
      if (url) { element.setAttribute(name, url); }
    }
    let sources = element.getAttribute('srcset');
    if (sources) {
      // Published paths cannot contain commas. Leave all other candidates intact,
      // including data URLs whose comma-separated parts must not be normalized.
      element.setAttribute('srcset', sources.split(',').map((candidate) => candidate.replace(/^(\s*)(\S+)/, (match, space, value) => {
        let url = publishedUrl(value);
        return url ? space + url : match;
      })).join(','));
    }
  }
}
