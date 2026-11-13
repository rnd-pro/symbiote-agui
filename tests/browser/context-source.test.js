import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('provider JSON sources load reactively, preserve overrides and bound state, publish edits and cancel stale work', {
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'provider-source').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'provider-source', '--no-open');
  await insertStdin('provider-source', `
    <context-provider id="host" ctx="HOST">
      <script type="application/json">{"draft":null,"bound":{"name":"Bound name"},"url":"https://example.test/first.json"}</script>
      <context-provider id="remote" ctx="REMOTE" pub-to="HOST/draft" bind="$.src: HOST/url">
        <script type="application/json">{"caption":"Inline caption","saved":"Restored value"}</script>
        <h2>{{name}}</h2><p>{{caption}}</p>
        <agui-field label="Remote name" pub-to="REMOTE/name" bind="$.value: REMOTE/name"></agui-field>
      </context-provider>
      <context-provider id="bound" src="https://example.test/ignored.json" bind="state: HOST/bound">
        <output>{{name}}</output>
      </context-provider>
      <context-provider id="attribute" src="https://example.test/second.json"><output>{{name}}</output></context-provider>
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
  /** @type {string[]} */
  let requested = [];
  /** @type {import('puppeteer').HTTPRequest | undefined} */
  let slow;
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    let url = new URL(request.url());
    if (url.hostname !== 'example.test') { await request.continue(); return; }
    requested.push(url.pathname);
    if (url.pathname === '/slow.json') { slow = request; return; }
    let responses = {
      '/first.json': '{"name":"Remote name","note":"Remote note","caption":"Remote caption","saved":"Remote value"}',
      '/second.json': '{"name":"Second name"}',
      '/broken.json': '{not JSON}',
      '/array.json': '[{"name":"Wrong shape"}]',
      '/null.json': 'null',
      '/scope.json': '{"HOST/draft":"Forbidden target"}',
      '/prototype.json': '{"__proto__":{"polluted":true}}',
      '/control.json': '{"src":"https://example.test/unexpected.json"}',
      '/state.json': '{"state":{"name":"Nested state"}}',
      '/status.json': '{"sourceLoading":false}',
      '/large.json': 'x'.repeat(1024 * 1024 + 1),
    };
    await request.respond({
      status: url.pathname === '/missing.json' ? 404 : 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: responses[/** @type {keyof typeof responses} */ (url.pathname)] ?? '{}',
    });
  });
  await page.goto(session.url);
  await page.waitForFunction(() => document.querySelector('#remote h2')?.textContent === 'Remote name', {
    timeout: 8000,
  }).catch(async (error) => {
    error.cause = JSON.stringify({
      errors,
      requested,
      providers: await page.$$eval('context-provider', (elements) => elements.map((element) => ({
        id: element.id,
        src: Reflect.get(element, '$')?.src,
        loading: Reflect.get(element, '$')?.sourceLoading,
        error: Reflect.get(element, '$')?.sourceError,
        name: Reflect.get(element, '$')?.name,
        bound: Reflect.get(element, 'sourceLoader')?.bound,
      }))),
    });
    throw error;
  });
  await page.waitForSelector('#remote input');
  assert.equal(await page.$eval('#remote p', (element) => element.textContent), 'Inline caption');
  assert.equal(await page.$eval('#remote', (element) => Reflect.get(element, '$').saved), 'Restored value');
  assert.equal(await page.$eval('#host', (element) => Reflect.get(element, '$').draft), null, 'Loading must not echo to pub-to.');
  assert.equal(await page.$eval('#bound output', (element) => element.textContent), 'Bound name');
  assert.equal(requested.includes('/ignored.json'), false);
  await page.$eval('#remote agui-field', (element) => Reflect.get(element, 'commit').call(element, 'Edited name'));
  assert.deepEqual(await page.$eval('#host', (element) => Reflect.get(element, '$').draft), {
    name: 'Edited name',
    note: 'Remote note',
    caption: 'Inline caption',
    saved: 'Restored value',
  });
  /** @param {unknown} url */
  let update = (url) => page.$eval('#host', (element, url) => { Reflect.get(element, '$').url = url; }, url);
  await update('https://example.test/slow.json');
  for (let attempt = 0; !slow && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(slow);
  assert.equal(await page.$eval('#remote', (element) => Reflect.get(element, '$').sourceLoading), true);
  await page.$eval('#remote', (element) => {
    Reflect.set(element, 'state', {
      name: 'Explicit state',
    });
  });
  await slow.respond({
    status: 200,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: '{"name":"Stale name"}',
  }).catch(() => {});
  await update('https://example.test/second.json');
  assert.equal(await page.$eval('#remote h2', (element) => element.textContent), 'Explicit state');
  await page.$eval('#remote', (element) => { Reflect.set(element, 'state', undefined); });
  await page.waitForFunction(() => document.querySelector('#remote h2')?.textContent === 'Second name');
  assert.equal(await page.$eval('#remote', (element) => Reflect.get(element, '$').note), undefined);
  for (let scenario of [
    {
      url: 'javascript:alert(1)',
      error: 'invalidSrc',
    },
    {
      url: 123,
      error: 'invalidSrc',
    },
    ...[
      'broken',
      'array',
      'null',
      'scope',
      'prototype',
      'control',
      'state',
      'status',
    ].map((name) => ({
      url: `https://example.test/${name}.json`,
      error: 'invalidData',
    })),
    {
      url: 'https://example.test/large.json',
      error: 'inputTooLarge',
    },
    {
      url: 'https://example.test/missing.json',
      error: 'fetchFailed',
    },
  ]) {
    await update(scenario.url);
    await page.waitForFunction((error) => {
      let element = document.querySelector('#remote');
      return element && Reflect.get(element, '$').sourceError === error;
    }, undefined, scenario.error);
    assert.equal(await page.$eval('#remote h2', (element) => element.textContent), 'Second name');
    assert.equal(await page.$eval('#remote', (element) => Reflect.get(element, '$').sourceLoading), false);
  }
  assert.equal(requested.includes('/unexpected.json'), false);
  await page.$eval('#attribute', (element) => element.setAttribute('src', 'https://example.test/first.json'));
  await page.waitForFunction(() => document.querySelector('#attribute output')?.textContent === 'Remote name');
  await page.$eval('#attribute', (element) => element.removeAttribute('src'));
  assert.equal(await page.$eval('#attribute output', (element) => element.textContent), 'Remote name');
  let previousSlow = slow;
  await update('https://example.test/slow.json');
  for (let attempt = 0; slow === previousSlow && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(slow);
  assert.notEqual(slow, previousSlow);
  await page.$eval('#remote', (element) => {
    Reflect.set(window, 'removedSourceProvider', element);
    element.remove();
  });
  await page.waitForFunction(() => Reflect.get(window, 'removedSourceProvider').allSubs.size === 0);
  await slow.respond({
    status: 200,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: '{"name":"Detached response"}',
  }).catch(() => {});
  assert.equal(await page.evaluate(() => Reflect.get(window, 'removedSourceProvider').sourceLoader.controller), undefined);
  assert.deepEqual(errors, []);
});
