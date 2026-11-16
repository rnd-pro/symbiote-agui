import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

test('native HTML imports retain AGUI bindings, reject executable markup and release replaced controls', {
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  t.after(async () => {
    await browser.close();
    await cli('stop', 'html-import').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'html-import', '--no-open');
  await insertStdin('html-import', `
    <sym-context id="import-data" ctx="IMPORT">
      <script type="application/json">{"source":"https://example.test/first.html","title":"Initial"}</script>
      <sym-import id="fragment" bind="@src: IMPORT/source"></sym-import>
      <sym-import id="literal" process-inner-html="false" src="https://example.test/literal.htm"></sym-import>
    </sym-context>
  `);
  let page = await browser.newPage();
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    let url = new URL(request.url());
    if (url.hostname !== 'example.test') { await request.continue(); return; }
    let body = url.pathname === '/first.html' ? `
      <h2>{{IMPORT/title}}</h2>
      <agui-field label="Title" pub-to="IMPORT/title" bind="$.value: IMPORT/title"></agui-field>
      <button type="button" value="Edited" bind="onclick: [set]IMPORT/title">Edit</button>
      <sym-context ctx="INNER"><script type="application/json">{"title":"Nested title"}</script><p>{{title}}</p></sym-context>
    ` : url.pathname === '/literal.htm' ? '<p>{{IMPORT/title}}</p>'
      : url.pathname === '/unsafe.html' ? '<script>window.importScriptExecuted = true;</script>'
      : '<h2>Replacement {{IMPORT/title}}</h2>';
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
  await page.waitForFunction(() => document.querySelector('#fragment h2')?.textContent === 'Initial');
  assert.equal(await page.$eval('#fragment sym-context p', (element) => element.textContent), 'Nested title');
  await page.waitForSelector('#literal p');
  assert.equal(await page.$eval('#literal p', (element) => element.textContent), '{{IMPORT/title}}');
  await page.click('#fragment button');
  assert.equal(await page.$eval('#fragment agui-field input', (element) => element.value), 'Edited');
  await page.$eval('#fragment agui-field', (element) => Reflect.set(window, 'oldImportField', element));
  /** @param {string} source */
  let update = (source) => page.$eval('#import-data', (element, source) => {
    Reflect.get(element, '$').source = 'https://example.test/' + source;
  }, source);
  await update('second.html');
  await page.waitForFunction(() => document.querySelector('#fragment h2')?.textContent === 'Replacement Edited');
  await page.waitForFunction(() => Reflect.get(window, 'oldImportField').allSubs.size === 0);
  for (let scenario of [
    {
      source: 'missing.html',
      code: 'HTTP_ERROR',
    },
    {
      source: 'unsafe.html',
      code: 'UNSAFE_TEMPLATE',
    },
  ]) {
    await update(scenario.source);
    await page.waitForFunction((code) => Reflect.get(/** @type {Element} */ (document.querySelector('#fragment')), '$')['+loadError']?.code === code,
      undefined, scenario.code);
    assert.equal(await page.$eval('#fragment h2', (element) => element.textContent), 'Replacement Edited');
  }
  assert.equal(await page.evaluate(() => Reflect.get(window, 'importScriptExecuted')), undefined);
  await page.$eval('#fragment', (element) => {
    Reflect.set(window, 'removedImport', element);
    element.remove();
  });
  await page.waitForFunction(() => Reflect.get(window, 'removedImport').allSubs.size === 0);
  assert.deepEqual(errors, []);
});
