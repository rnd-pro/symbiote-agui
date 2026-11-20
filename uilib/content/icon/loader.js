import { ICON_FONT_FAMILY, ICON_FONT_STYLESHEET } from './font.js';
import { ICON_NAMES } from './collection.js';

/** @type {WeakMap<Document, Promise<boolean>>} */
let loads = new WeakMap();

/** @param {Document} document */
export function loadIconFont(document) {
  let pending = loads.get(document);
  if (pending) { return pending; }
  let ready = connect(document).catch(() => false);
  loads.set(document, ready);
  return ready;
}

/** @param {Document} document */
async function connect(document) {
  let links = /** @type {NodeListOf<HTMLLinkElement>} */ (document.querySelectorAll('link[rel~="stylesheet"]'));
  let link = Array.from(links).find((element) => element.href === ICON_FONT_STYLESHEET);
  let stylesheet = /** @type {HTMLLinkElement} */ (link || document.createElement('link'));
  if (!link) {
    stylesheet.rel = 'stylesheet';
    stylesheet.href = ICON_FONT_STYLESHEET;
    stylesheet.crossOrigin = 'anonymous';
    stylesheet.referrerPolicy = 'no-referrer';
  }
  let loaded = stylesheet.sheet ? true : await new Promise((resolve) => {
    let finish = (/** @type {boolean} */ success) => {
      clearTimeout(timeout);
      stylesheet.removeEventListener('load', onLoad);
      stylesheet.removeEventListener('error', onError);
      resolve(success);
    };
    let onLoad = () => finish(true);
    let onError = () => finish(false);
    let timeout = setTimeout(onError, 10_000);
    stylesheet.addEventListener('load', onLoad);
    stylesheet.addEventListener('error', onError);
    if (!link) { document.head.append(stylesheet); }
  });
  if (!loaded) { return false; }
  let faces = await document.fonts.load(`400 24px "${ICON_FONT_FAMILY}"`, Object.values(ICON_NAMES)[0]);
  return faces.length > 0 && faces.every((face) => face.status === 'loaded');
}
