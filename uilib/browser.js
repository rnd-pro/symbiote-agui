import { registerUiLibComponents } from './index.js';

export * from './index.js';
export { default } from './index.js';

let base = new URL('./', import.meta.url);
registerUiLibComponents({
  assetBaseUrl: base,
});
let url = new URL('styles.css', base).href;
let links = /** @type {NodeListOf<HTMLLinkElement>} */ (document.querySelectorAll('link[rel~="stylesheet"]'));
if (!Array.from(links).some((link) => link.href === url)) {
  let link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.crossOrigin = 'anonymous';
  link.referrerPolicy = 'no-referrer';
  document.head.append(link);
}
