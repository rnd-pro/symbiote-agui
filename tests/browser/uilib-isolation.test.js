import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { jsBuild } from 'jsda-kit/server/build-asset.js';
import puppeteer from 'puppeteer';
import { closeServer, waitForServer } from '../../src/shared/server.js';

test('the library works without AGUI services and bubbles component actions to its host', {
  timeout: 30_000,
}, async (t) => {
  let script = await jsBuild(fileURLToPath(new URL('../../uilib/index.js', import.meta.url)));
  let stylesheet = await readFile(new URL('../../uilib/dist/styles.css', import.meta.url), 'utf8');
  let requests = /** @type {string[]} */ ([]);
  let server = createServer((request, response) => {
    requests.push(request.url || '');
    if (request.url === '/library.js') {
      response.writeHead(200, {
        'Content-Type': 'text/javascript',
      }).end(script);
    } else if (request.url === '/styles.css') {
      response.writeHead(200, {
        'Content-Type': 'text/css',
      }).end(stylesheet);
    } else if (request.url === '/') {
      response.writeHead(200, {
        'Content-Type': 'text/html',
      }).end(`<!doctype html>
        <link rel="stylesheet" href="./styles.css">
        <script type="module">
          import { registerUiLibComponents } from './library.js';
          registerUiLibComponents();
          window.actions = [];
          document.addEventListener('agui:action', (event) => window.actions.push(event.detail));
        </script>
        <sym-context ctx="APP">
          <script type="application/json">{
            "name": "Initial", "theme": "light", "palette": "graphite",
            "texts": {"graphite": "Graphite", "ocean": "Ocean"}
          }</script>
          <agui-field label="Name" pub-to="APP/name" bind="$.value: APP/name"></agui-field>
          <agui-theme-toggle ctx="APP" label="Theme"></agui-theme-toggle>
          <agui-theme-selector label="Palette" pub-to="APP/palette"
            bind="$.value: APP/palette; $.texts: APP/texts"></agui-theme-selector>
        </sym-context>`);
    } else { response.writeHead(404).end(); }
  });
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => { await browser?.close(); await closeServer(server); });
  server.listen(0, '127.0.0.1');
  let url = await waitForServer(server);
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  let page = await browser.newPage();
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.evaluateOnNewDocument(() => {
    Reflect.set(window, 'socketAttempts', 0);
    window.WebSocket = class extends WebSocket {
      /**
       * @param {string | URL} url
       * @param {string | string[]} [protocols]
       */
      constructor(url, protocols) {
        Reflect.set(window, 'socketAttempts', Reflect.get(window, 'socketAttempts') + 1);
        super(url, protocols);
      }
    };
  });
  await page.goto(url);
  await page.waitForSelector('agui-field input');
  await page.locator('agui-field input').fill('Edited');
  await page.locator('agui-theme-toggle button').click();
  await page.locator('agui-theme-selector > button:not(:disabled)').click();
  await page.locator('.agui-theme-option[value="ocean"]').click();
  assert.deepEqual(await page.$eval('sym-context', (provider) => ({
    name: Reflect.get(provider, '$').name,
    theme: Reflect.get(provider, '$').theme,
    palette: Reflect.get(provider, '$').palette,
  })), {
    name: 'Edited',
    theme: 'dark',
    palette: 'ocean',
  });
  let actions = await page.evaluate(() => Reflect.get(window, 'actions'));
  assert.ok(actions.some((/** @type {{ action: string; value?: string }} */ action) => action.action === 'change' && action.value === 'Edited'));
  assert.ok(actions.some((/** @type {{ action: string; value?: string }} */ action) => action.action === 'change' && action.value === 'ocean'));
  assert.equal(await page.evaluate(() => Reflect.get(window, 'socketAttempts')), 0);
  assert.equal(await page.evaluate(() => customElements.get('agui-data-toolbar') || customElements.get('agui-connector')), undefined);
  assert.deepEqual(requests.filter((path) => ![
    '/',
    '/library.js',
    '/styles.css',
    '/favicon.ico',
  ].includes(path)), []);
  assert.deepEqual(errors, []);
});
