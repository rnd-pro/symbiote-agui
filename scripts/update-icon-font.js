import { writeFile } from 'node:fs/promises';
import { ICON_NAMES } from '../src/page/client/uilib/content/icon/collection.js';

let source = new URL('https://fonts.googleapis.com/css2');
source.searchParams.set('family', 'Material Symbols Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
source.searchParams.set('icon_names', Object.keys(ICON_NAMES).sort().join(','));
source.searchParams.set('display', 'block');
// Google Fonts selects the font format and variable axes from browser support.
let headers = { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' };
let response = await fetch(source, { headers });
if (!response.ok) { throw new Error(`Icon stylesheet download failed: ${response.status}.`); }
let stylesheet = await response.text();
let fontUrl = stylesheet.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\('woff2'\)/)?.[1];
if (!fontUrl) { throw new Error('Google Fonts did not return a WOFF2 subset.'); }
let fontResponse = await fetch(fontUrl);
if (!fontResponse.ok) { throw new Error(`Icon font download failed: ${fontResponse.status}.`); }
let font = Buffer.from(await fontResponse.arrayBuffer());
if (font.subarray(0, 4).toString() !== 'wOF2') { throw new Error('The icon font is not WOFF2.'); }
let fontModule = `// Material Symbols Outlined subset. Apache-2.0; see LICENSE.txt.\nexport default 'data:font/woff2;base64,${font.toString('base64')}';\n`;
await writeFile(new URL('../src/page/client/uilib/content/icon/font-data.js', import.meta.url), fontModule);
process.stdout.write(`Updated ${Object.keys(ICON_NAMES).length} icons (${font.length} font bytes).\n`);
