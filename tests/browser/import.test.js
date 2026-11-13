import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('HTML imports replace host content with scoped bindings, ignore stale loads and release removed components', {
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'html-import').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'html-import', '--no-open');
  await insertStdin('html-import', `
    <context-provider id="import-data" ctx="IMPORT">
      <script type="application/json">
        {"source":"https://example.test/first.html","title":"Initial","items":[{"name":"One"},{"name":"Two"}]}
      </script>
      <agui-import id="fragment" bind="$.src: IMPORT/source"></agui-import>
      <agui-import id="literal" process-inner-html="false" src="https://example.test/literal.htm"></agui-import>
    </context-provider>
  `);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  /** @type {import('puppeteer').HTTPRequest | undefined} */
  let slow;
  /** @type {string[]} */
  let aborted = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('requestfailed', (request) => aborted.push(request.url()));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    let url = new URL(request.url());
    if (url.hostname !== 'example.test') { await request.continue(); return; }
    if (url.pathname === '/slow.htm') { slow = request; return; }
    let body = url.pathname === '/first.html' ? `
      <h2>{{IMPORT/title}}</h2>
      <agui-field label="Title" pub-to="IMPORT/title" bind="$.value: IMPORT/title"></agui-field>
      <agui-button set="IMPORT/title" value="Edited">Edit title</agui-button>
      <context-provider ctx="INNER">
        <script type="application/json">{"title":"Nested title"}</script>
        <p>{{title}}</p>
      </context-provider>
      <ul itemize="IMPORT/items"><template><li>{{name}}</li></template></ul>
      <script>window.importScriptExecuted = true;</script>
    ` : url.pathname === '/literal.htm' ? '<p>{{IMPORT/title}}</p><agui-button set="IMPORT/title" value="Literal action">Edit</agui-button>'
      : url.pathname === '/large.html' ? 'x'.repeat(1024 * 1024 + 1) : '<h2>Replacement {{IMPORT/title}}</h2>';
    await request.respond({
      status: url.pathname === '/missing.html' ? 404 : 200,
      contentType: 'text/html',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body,
    });
  });
  await page.goto(session.url);
  await page.waitForFunction(() => document.querySelector('#fragment > h2')?.textContent === 'Initial');
  await page.waitForSelector('#fragment agui-field input');
  await page.waitForSelector('#literal > p');
  assert.equal(await page.$eval('#fragment context-provider p', (element) => element.textContent), 'Nested title');
  assert.deepEqual(await page.$$eval('#fragment li', (items) => items.map((item) => item.textContent)), [
    'One',
    'Two',
  ]);
  assert.equal(await page.$eval('#literal > p', (element) => element.textContent), '{{IMPORT/title}}');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'importScriptExecuted')), undefined);
  await page.locator('#fragment agui-button button').click();
  await page.waitForFunction(() => document.querySelector('#fragment > h2')?.textContent === 'Edited');
  assert.equal(await page.$eval('#fragment agui-field input', (element) => element.value), 'Edited');
  await page.evaluate(() => {
    Reflect.set(window, 'oldImportHeading', document.querySelector('#fragment > h2'));
    Reflect.set(window, 'oldImportField', document.querySelector('#fragment agui-field'));
  });
  /** @param {unknown} source */
  let update = (source) => page.$eval('#import-data', (element, source) => {
    Reflect.get(element, '$').source = source;
  }, source);
  await update('https://example.test/slow.htm');
  await page.waitForFunction(() => document.querySelector('#fragment')?.getAttribute('aria-busy') === 'true');
  await page.waitForFunction(() => !document.querySelector('#fragment > h2'));
  // Wait for interception before superseding this request.
  for (let attempt = 0; !slow && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(slow);
  await update('https://example.test/second.html');
  await page.waitForFunction(() => document.querySelector('#fragment > h2')?.textContent === 'Replacement Edited');
  await slow.respond({
    status: 200,
    contentType: 'text/html',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: '<p>Stale content</p>',
  }).catch(() => {});
  await page.$eval('#import-data', (element) => { Reflect.get(element, '$').title = 'New title'; });
  assert.equal(await page.$eval('#fragment > h2', (element) => element.textContent), 'Replacement New title');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'oldImportHeading').textContent), 'Edited');
  await page.waitForFunction(() => Reflect.get(window, 'oldImportField').allSubs.size === 0);
  for (let scenario of [
    {
      source: 'https://example.test/missing.html',
      error: 'fetchFailed',
    },
    {
      source: 'https://example.test/large.html',
      error: 'inputTooLarge',
    },
    {
      source: 'javascript:alert(1)',
      error: 'invalidSrc',
    },
    {
      source: 123,
      error: 'invalidSrc',
    },
  ]) {
    await update(scenario.source);
    await page.waitForFunction((error) => {
      let element = document.querySelector('#fragment');
      return element && Reflect.get(element, '$').error === error;
    }, {}, scenario.error);
    assert.equal(await page.$eval('#fragment', (element) => element.childNodes.length), 0);
    assert.equal(await page.$eval('#fragment', (element) => element.getAttribute('aria-busy')), 'false');
  }
  // Attribute sources work without property bindings and can be cleared.
  await page.$eval('#literal', (element) => element.setAttribute('src', 'https://example.test/second.html'));
  await page.waitForSelector('#literal > h2');
  await page.$eval('#literal', (element) => element.removeAttribute('src'));
  await page.waitForFunction(() => !document.querySelector('#literal')?.childNodes.length);
  await update('https://example.test/second.html');
  await page.waitForSelector('#fragment > h2');
  await page.$eval('#fragment', (element) => {
    let parent = element.parentElement;
    element.remove();
    parent?.append(element);
  });
  await page.waitForFunction(() => document.querySelector('#fragment > h2')?.textContent === 'Replacement New title');
  await page.$eval('#fragment', (element) => {
    Reflect.set(window, 'removedImport', element);
    element.remove();
  });
  await page.waitForFunction(() => Reflect.get(window, 'removedImport').allSubs.size === 0);
  assert.ok(aborted.some((url) => url.endsWith('/slow.htm')));
  assert.deepEqual(errors, []);
});
