import { readFile } from 'node:fs/promises';
import { UILIB_ASSET_PATH } from '../markup/constants.js';

export function libraryEntry() {
  let value = process.env.AGUI_UILIB_URL;
  if (!value) { return `${UILIB_ASSET_PATH}library.js`; }
  let url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/library.js')) {
    throw new Error('AGUI_UILIB_URL must be an HTTPS URL ending in /library.js.');
  }
  return url.href;
}

export async function libraryAssets() {
  let root = new URL('../../uilib/dist/', import.meta.url);
  let names = /** @type {string[]} */ (JSON.parse(await readFile(new URL('assets.json', root), 'utf8')));
  let files = new Map(names.filter((name) => /^[\w./-]+\.(js|css|png)$/.test(name) && !name.split('/').includes('..') && !name.startsWith('/'))
    .map((name) => [
      `${UILIB_ASSET_PATH}${name}`,
      new URL(name, root),
    ]));
  /**
   * @param {import('node:http').IncomingMessage} request
   * @param {import('node:http').ServerResponse} response
   */
  return async (request, response) => {
    let path = (request.url || '').split('?')[0];
    if (!path.startsWith(UILIB_ASSET_PATH)) { return false; }
    let file = files.get(path);
    if (!file || !['GET', 'HEAD'].includes(request.method || '')) {
      response.writeHead(404).end();
      return true;
    }
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', file.pathname.endsWith('.js') ? 'text/javascript' : file.pathname.endsWith('.css') ? 'text/css' : 'image/png');
    try {
      response.end(request.method === 'HEAD' ? undefined : await readFile(file));
    } catch { response.writeHead(404).end(); }
    return true;
  };
}
