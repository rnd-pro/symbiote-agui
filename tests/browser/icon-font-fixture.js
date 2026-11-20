import { readFile } from 'node:fs/promises';
import { ICON_FONT_FAMILY, ICON_FONT_STYLESHEET, ICON_FONT_ORIGIN } from '../../uilib/content/icon/font.js';

// Google Fonts Material Symbols "home" subset; Apache-2.0, see uilib/content/icon/LICENSE.txt.
let font = await readFile(new URL('./fixtures/material-symbols-home.woff2', import.meta.url));
let fontUrl = `${ICON_FONT_ORIGIN}/fixture.woff2`;

/**
 * @param {import('puppeteer').Page} page
 * @param {string} [failure]
 */
export async function mockIconFont(page, failure = '') {
  let requests = /** @type {string[]} */ ([]);
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    let url = request.url();
    if (url !== ICON_FONT_STYLESHEET && url !== fontUrl) {
      await request.continue();
      return;
    }
    requests.push(url);
    let stylesheet = url === ICON_FONT_STYLESHEET;
    let failed = failure === (stylesheet ? 'stylesheet failure' : 'font failure');
    await request.respond({
      status: failed ? 503 : 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      contentType: stylesheet ? 'text/css' : 'font/woff2',
      body: failed ? '' : stylesheet ? `@font-face {
        font-family: '${ICON_FONT_FAMILY}';
        src: url('${fontUrl}') format('woff2');
        font-weight: 100 700;
      }` : font,
    });
  });
  return requests;
}
