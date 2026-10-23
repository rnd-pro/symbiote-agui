import { readFile } from 'node:fs/promises';
import { MAP_CSS_PATH, MAP_ASSET_PREFIX } from '../page/client/uilib/widgets/map/constants.js';

let assets = Object.fromEntries([
  'layers.png',
  'layers-2x.png',
  'marker-icon.png',
  'marker-icon-2x.png',
  'marker-shadow.png',
].map((name) => [
  `${MAP_ASSET_PREFIX}${name}`,
  name,
]));

/**
 * @param {string | undefined} pathname
 * @param {import('node:http').ServerResponse} response
 */
export async function serveMapAsset(pathname, response) {
  let name = pathname === MAP_CSS_PATH ? 'leaflet.css' : assets[pathname ?? ''];
  if (!name) { return false; }
  let css = pathname === MAP_CSS_PATH;
  let url = new URL(`./dist/${css ? name : `images/${name}`}`, import.meta.resolve('leaflet/package.json'));
  let data = await readFile(url);
  response.setHeader('Content-Type', css ? 'text/css; charset=utf-8' : 'image/png');
  response.end(css ? data.toString().replaceAll('url(images/', `url(${MAP_ASSET_PREFIX}`) : data);
  return true;
}
