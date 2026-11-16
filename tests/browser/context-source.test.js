import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

test('native JSON contexts integrate with AGUI edits, protected defaults, explicit reload and request cleanup', {
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  t.after(async () => {
    await browser.close();
    await cli('stop', 'provider-source').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'provider-source', '--no-open');
  await insertStdin('provider-source', `
    <sym-context id="host" ctx="HOST">
      <script type="application/json">{"draft":null,"url":"https://example.test/first.json"}</script>
      <sym-context id="remote" ctx="REMOTE" pub-to="HOST/draft" bind="@src: HOST/url">
        <script type="application/json">{"caption":"Inline caption"}</script>
        <h2>{{name}}</h2><p>{{caption}}</p>
        <agui-field label="Remote name" pub-to="REMOTE/name" bind="$.value: REMOTE/name"></agui-field>
      </sym-context>
      <sym-context id="preserved" ctx="SAVED" persist="note" src="https://example.test/saved.json">
        <script type="application/json">{"note":"Worker value"}</script><output>{{note}}</output>
      </sym-context>
      <button id="reload" type="button" action-overwrite bind="onclick: [load]REMOTE">Reload</button>
    </sym-context>
  `);
  let page = await browser.newPage();
  let errors = /** @type {string[]} */ ([]);
  let slow = /** @type {import('puppeteer').HTTPRequest | undefined} */ (undefined);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    let url = new URL(request.url());
    if (url.hostname !== 'example.test') { await request.continue(); return; }
    if (url.pathname === '/slow.json') { slow = request; return; }
    await request.respond({
      status: url.pathname === '/missing.json' ? 404 : 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: url.pathname === '/broken.json' ? '{broken}' : JSON.stringify({
        name: url.pathname === '/first.json' ? 'First name' : 'Second name',
        caption: 'Remote caption',
        note: 'Remote default',
      }),
    });
  });
  await page.goto(session.url);
  await page.waitForFunction(() => document.querySelector('#remote h2')?.textContent === 'First name');
  assert.equal(await page.$eval('#remote p', (element) => element.textContent), 'Remote caption');
  assert.equal(await page.$eval('#host', (element) => Reflect.get(element, '$').draft), null);
  await page.$eval('#remote agui-field', (element) => Reflect.get(element, 'commit').call(element, 'Edited name'));
  assert.equal(await page.$eval('#host', (element) => Reflect.get(element, '$').draft.name), 'Edited name');
  /** @param {string} path */
  let update = (path) => page.$eval('#host', (element, path) => {
    Reflect.get(element, '$').url = 'https://example.test/' + path;
  }, path);
  await update('slow.json');
  await page.waitForFunction(() => Reflect.get(/** @type {Element} */ (document.querySelector('#remote')), '$')['+loading']);
  assert.ok(slow);
  await update('second.json');
  await page.waitForFunction(() => !Reflect.get(/** @type {Element} */ (document.querySelector('#remote')), '$')['+loading']);
  assert.equal(await page.$eval('#remote h2', (element) => element.textContent), 'Edited name');
  await slow?.respond({
    status: 200,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: '{"name":"Stale name"}',
  }).catch(() => {});
  await page.click('#reload');
  await page.waitForFunction(() => document.querySelector('#remote h2')?.textContent === 'Second name');
  for (let scenario of [
    {
      path: 'broken.json',
      code: 'INVALID_DATA',
    },
    {
      path: 'missing.json',
      code: 'HTTP_ERROR',
    },
  ]) {
    await update(scenario.path);
    await page.waitForFunction((code) => Reflect.get(/** @type {Element} */ (document.querySelector('#remote')), '$')['+loadError']?.code === code,
      undefined, scenario.code);
    assert.equal(await page.$eval('#remote h2', (element) => element.textContent), 'Second name');
  }
  await page.$eval('#remote', (element) => {
    Reflect.set(window, 'removedProvider', element);
    element.remove();
  });
  await page.waitForFunction(() => Reflect.get(window, 'removedProvider').allSubs.size === 0);
  assert.equal(await page.$eval('#preserved output', (element) => element.textContent), 'Worker value');
  let saved = await page.evaluate(async () => {
    let owner = /** @type {import('../../types/components.js').ComponentHost} */ (document.querySelector('#preserved'));
    owner.$.note = 'Committed note';
    let {
      commitData,
    } = await import(new URL('/client/index.js', location.href).href);
    return commitData([
      {
        provider: 'SAVED',
        keys: [
          'note',
        ],
      },
    ]);
  });
  assert.equal(saved.state, 'committed');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#preserved output')?.textContent === 'Committed note');
  await page.waitForFunction(() => !Reflect.get(/** @type {Element} */ (document.querySelector('#preserved')), '$')['+loading']);
  assert.equal(await page.$eval('#preserved output', (element) => element.textContent), 'Committed note');
  assert.deepEqual(errors, []);
});
