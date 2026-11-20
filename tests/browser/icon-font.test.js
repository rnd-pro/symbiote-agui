import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { jsBuild } from 'jsda-kit/server/build-asset.js';
import puppeteer from 'puppeteer';
import { closeServer, waitForServer } from '../../src/shared/server.js';
import { ICON_NAMES } from '../../uilib/content/icon/collection.js';
import { ICON_FONT_STYLESHEET, ICON_STYLESHEET_ORIGIN, ICON_FONT_ORIGIN } from '../../uilib/content/icon/font.js';
import { mockIconFont } from './icon-font-fixture.js';

let script = await jsBuild(fileURLToPath(new URL('../../uilib/index.js', import.meta.url)));

for (let scenario of [
  'automatic',
  'supplied',
  'stylesheet failure',
  'font failure',
]) {
  test(`icon loading: ${scenario} shares one request and keeps controls available`, {
    timeout: 30_000,
  }, async (t) => {
    let server = createServer((request, response) => {
      if (request.url === '/library.js') {
        response.writeHead(200, {
          'Content-Type': 'text/javascript',
        }).end(script);
        return;
      }
      response.writeHead(200, {
        'Content-Type': 'text/html',
      }).end(`<!doctype html>
        ${scenario === 'supplied' ? `<link rel="stylesheet" href="${ICON_FONT_STYLESHEET}">` : ''}
        <script type="module">
          import { registerUiLibComponents, loadIconFont } from '/library.js';
          registerUiLibComponents();
          registerUiLibComponents();
          document.querySelector('agui-button').addEventListener('click', () => { window.clicked = true; });
          window.fontResults = await Promise.all([loadIconFont(document), loadIconFont(document)]);
        </script>
        <agui-icon name="home" aria-label="Home"></agui-icon>
        <agui-button>Continue</agui-button>`);
    });
    /** @type {import('puppeteer').Browser | undefined} */
    let browser;
    t.after(async () => {
      await browser?.close();
      await closeServer(server);
    });
    server.listen(0, '127.0.0.1');
    let origin = await waitForServer(server);
    browser = await puppeteer.launch({
      executablePath: process.env.AGUI_TEST_BROWSER_PATH,
      headless: true,
    });
    let page = await browser.newPage();
    let requests = await mockIconFont(page, scenario);
    let errors = /** @type {string[]} */ ([]);
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(origin);
    await page.waitForFunction(() => Array.isArray(Reflect.get(window, 'fontResults')));
    await page.waitForSelector('agui-icon > span');
    let success = !scenario.endsWith('failure');
    assert.deepEqual(await page.evaluate(() => Reflect.get(window, 'fontResults')), [
      success,
      success,
    ]);
    assert.equal(requests.filter((url) => url.startsWith(ICON_STYLESHEET_ORIGIN)).length, 1);
    assert.equal(requests.filter((url) => url.startsWith(ICON_FONT_ORIGIN)).length, scenario === 'stylesheet failure' ? 0 : 1);
    let requested = new URL(requests[0]);
    assert.equal(requested.searchParams.get('display'), 'block');
    assert.deepEqual(requested.searchParams.get('icon_names')?.split(','), [
      ...new Set(Object.values(ICON_NAMES)),
    ].sort());
    assert.equal(await page.$$eval('link[rel="stylesheet"]', (links) => links.length), 1);
    assert.equal(await page.$eval('agui-icon > span', (element) => element.hidden), !success);
    assert.equal(await page.$eval('agui-icon', (element) => element.getAttribute('aria-label')), 'Home');
    await page.locator('agui-button button').click();
    assert.equal(await page.evaluate(() => Reflect.get(window, 'clicked')), true);
    assert.deepEqual(errors, []);
  });
}
