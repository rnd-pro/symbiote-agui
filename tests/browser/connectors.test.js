import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import puppeteer from 'puppeteer';
import { connectorFixture } from '../node/connector-fixture.js';
import { core } from '../../src/connectors/core.js';
import { cli, insertStdin } from './helpers.js';

test('native browser connector calls recover through receipt reads without executing again', {
  timeout: 60000,
}, async (t) => {
  let f = await connectorFixture(t);
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  f.cleanup(async () => {
    await cli('stop', 'backend').catch(() => {});
    await browser.close();
  });
  await f.attach();
  await f.grant('backend', 'agui');
  let started = await cli('start', 'backend', '--no-open');
  await insertStdin('backend', `<button id="save" type="button">Save fixture</button>
<script type="module" data-agui>
let { PubSub } = await import(new URL('/client/index.js', location.href).href);
export default (root, api) => {
  window.connectorTest ||= {};
  Object.assign(window.connectorTest, api, { PubSub });
  let controller = new AbortController();
  root.querySelector('#save').addEventListener('click', async () => {
    let requestId = crypto.randomUUID();
    window.connectorTest.requestId = requestId;
    window.connectorTest.result = await api.callConnector('save', { value: 'browser value', delay: 1200 }, { requestId });
  }, { signal: controller.signal });
  return () => controller.abort();
};
</script>`);
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(/** @type {string} */ (started.url));
  await page.waitForFunction(() => Reflect.get(window, 'connectorTest')?.PubSub.getCtx('AGUI_CONNECTORS').read('connected'));
  let missing = await page.evaluate((id) => Reflect.get(window, 'connectorTest').readConnectorReceipt('save', id), randomUUID());
  assert.equal(missing.state, 'unknown');
  assert.equal(missing.code, 'NOT_FOUND');
  await page.click('#save');
  let requestId = await page.evaluate(() => Reflect.get(window, 'connectorTest').requestId);
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await core.listReceipts(f.coreRoot)).some((entry) => entry.requestId === requestId)) { break; }
    await delay(20);
  }
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.waitForFunction(() => Reflect.get(window, 'connectorTest').result?.state === 'unknown');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction(() => Reflect.get(window, 'connectorTest').PubSub.getCtx('AGUI_CONNECTORS').read('connected'));
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await core.getReceipt(f.coreRoot, requestId)).state === 'completed') { break; }
    await delay(30);
  }
  let result = await page.evaluate((id) => Reflect.get(window, 'connectorTest').readConnectorReceipt('save', id), requestId);
  assert.equal(result.state, 'completed');
  assert.equal(result.requestId, requestId);
  assert.equal(result.value.value, 'browser value');
  assert.ok(!JSON.stringify(result).includes(f.coreRoot));
  assert.ok(!JSON.stringify(result).includes('grantId'));
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 1);
  assert.deepEqual(errors, []);
});
