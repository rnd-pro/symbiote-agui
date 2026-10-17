import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, hasCliError, insertStdin } from './helpers.js';
import { CLIENT_SCRIPT_PATH } from '../../src/markup/constants.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('RAT templates, context providers, and handlers survive repeated insertions', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 90_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await cli('stop', 'components').catch(() => {});
    await browser?.close();
    await state.close();
  });
  browser = await puppeteer.launch({ executablePath, headless: true, userDataDir: join(state.directory, 'browser'), timeout: 10_000, protocolTimeout: 10_000 });
  let started = await cli('start', 'components', '--no-open');
  let page = await browser.newPage();
  await page.goto(started.url);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await insertStdin('components', [
    '<context-provider id="parent">',
    '<script type="text/json">{"count":1,"increment":null}</script>',
    '<agui-component><output id="inherited">{{^count}}</output><button id="increment" bind="onclick: ^increment">Add</button></agui-component>',
    '<context-provider><script type="application/json">{"count":9}</script><agui-component><output id="nearest">{{^count}}</output></agui-component></context-provider>',
    '</context-provider>',
    '<template id="card-template"><section class="p-4"><b id="name">{{userName}}</b><span id="age">{{userAge}}</span></section></template>',
    '<user-card id="card" ctx="user-ctx" use-template="template#card-template"><script type="application/json">{"userName":"Alex","userAge":42}</script></user-card>',
    '<agui-component ctx="map"><output id="shared">{{*lat}} / {{*lon}}</output></agui-component>',
    '<agui-component><output id="namespace">{{map/lat}}</output></agui-component>',
    '<context-provider id="map" ctx="map"><script type="text/json">{"lat":10,"lon":20,"literal":"{{keep}}"}</script><output id="own">{{lat}}</output></context-provider>',
  ].join('\n'));
  assert.equal(await page.$eval('#inherited', (element) => element.textContent), '1');
  assert.equal(await page.$eval('#nearest', (element) => element.textContent), '9');
  assert.equal(await page.$eval('#name', (element) => element.textContent), 'Alex');
  assert.equal(await page.$eval('#shared', (element) => element.textContent), '10 / 20');
  assert.equal(await page.$eval('#namespace', (element) => element.textContent), '10');
  assert.match(await page.$eval('#map > script', (element) => element.textContent || ''), /\{\{keep\}\}/);

  await page.$eval('#parent', (element) => {
    let parent = /** @type {import('../../types/components.js').ComponentHost} */ (element);
    parent.set$({ increment: () => { parent.$.count = Number(parent.$.count) + 1; } });
  });
  await page.click('#increment');
  assert.equal(await page.$eval('#inherited', (element) => element.textContent), '2');
  assert.equal(await page.$eval('#nearest', (element) => element.textContent), '9');
  await page.$eval('#card', (element) => {
    let card = /** @type {import('../../types/components.js').ComponentHost} */ (element);
    card.$.userName = 'Changed';
    card.set$({ userName: 'Updated', userAge: 43 });
  });
  assert.equal(await page.$eval('#name', (element) => element.textContent), 'Updated');
  assert.equal(await page.$eval('#age', (element) => element.textContent), '43');
  await page.$eval('#map', (element) => {
    let provider = /** @type {import('../../types/components.js').ComponentHost} */ (element);
    provider.$.lat = 55;
    provider.set$({ lat: 66, lon: 99 });
    Reflect.set(window, 'oldProvider', provider);
  });
  assert.equal(await page.$eval('#shared', (element) => element.textContent), '66 / 99');
  assert.equal(await page.$eval('#own', (element) => element.textContent), '66');
  assert.equal(await page.$eval('#namespace', (element) => element.textContent), '66');
  await page.$eval('agui-component[ctx="map"]', (element) => {
    let consumer = /** @type {import('../../types/components.js').ComponentHost} */ (element);
    consumer.$['*lat'] = 77;
  });
  assert.equal(await page.$eval('#own', (element) => element.textContent), '77');
  assert.equal(await page.$eval('#shared', (element) => element.textContent), '77 / 99');

  assert.deepEqual(await page.$eval('#map', (element) => {
    let provider = /** @type {import('../../types/components.js').ComponentHost} */ (element);
    provider.add$({ zoom: 3 });
    let initialShared = provider.$['map/zoom'];
    let notifications = 0;
    provider.sub('zoom', () => { notifications += 1; }, false);
    provider.add$({ zoom: 4 }, true);
    provider.add$({ zoom: 5 });
    let shared = provider.$['map/zoom'];
    provider.$['map/zoom'] = 6;
    return { initialShared, shared, local: provider.$.zoom, notifications };
  }), { initialShared: 3, shared: 4, local: 6, notifications: 2 });

  for (let invalid of [
    '<context-provider><script type="text/json">{broken}</script></context-provider>',
    '<agui-component><script type="text/json">[]</script></agui-component>',
    '<user-card use-template="#missing"></user-card>',
    '<context-provider ctx="same"></context-provider><context-provider ctx="same"></context-provider>',
  ]) {
    await assert.rejects(insertStdin('components', invalid), (error) => hasCliError(error, 'INSERT_FAILED'));
    assert.equal(await page.$eval('#shared', (element) => element.textContent), '77 / 99');
  }

  await insertStdin('components', [
    '<template id="embedded-template"><context-provider ctx="embedded"><script type="text/json">{"value":42}</script></context-provider></template>',
    '<agui-component><output id="embedded-read">{{embedded/value}}</output></agui-component>',
    '<embedded-card use-template="#embedded-template"></embedded-card>',
    '<template id="card-template"><h2 class="p-8" id="fresh">Fresh {{userName}}</h2></template>',
    '<user-card use-template="template#card-template"><script type="text/json">{"userName":"Replacement"}</script></user-card>',
    '<context-provider id="map" ctx="map"><script type="application/json">{"lat":1,"lon":2}</script></context-provider>',
    '<agui-component ctx="map"><output id="shared">{{*lat}} / {{*lon}}</output></agui-component>',
  ].join('\n'));
  assert.equal(await page.$eval('#fresh', (element) => element.textContent), 'Fresh Replacement');
  assert.equal(await page.$eval('#fresh', (element) => getComputedStyle(element).padding), '32px');
  assert.equal(await page.$eval('#shared', (element) => element.textContent), '1 / 2');
  assert.equal(await page.$eval('#embedded-read', (element) => element.textContent), '42');
  await page.evaluate(() => Reflect.get(window, 'oldProvider').set$({ lat: 888 }));
  assert.equal(await page.$eval('#shared', (element) => element.textContent), '1 / 2');
  await page.waitForFunction(() => Reflect.get(window, 'oldProvider').allSubs.size === 0);
  await insertStdin('components', '');
  assert.equal(await page.evaluate(async (path) => {
    let { PubSub } = await import(path);
    return PubSub.getCtx('map', false) === null && PubSub.getCtx('embedded', false) === null;
  }, CLIENT_SCRIPT_PATH), true);
  assert.deepEqual(errors, []);
});
