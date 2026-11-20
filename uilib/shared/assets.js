let base = new URL('../', import.meta.url);

/** @param {URL | string} url */
export function setLibraryAssetBase(url) {
  base = new URL(url, document.baseURI);
  if (!base.pathname.endsWith('/')) { base.pathname += '/'; }
}

/** @param {string} path */
export function libraryAssetUrl(path) {
  return new URL(path, base).href;
}
