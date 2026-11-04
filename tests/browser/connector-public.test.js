import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { publicConnectorFixture } from '../node/connector-public-fixture.js';
import { tunnelProxy } from './tunnel-proxy.js';

// Exercise the real HTTPS/browser/WebSocket path without creating an external tunnel.
test('public browser capabilities authorize explicitly and recover receipts after reconnect without exposing tokens to viewers', {
  timeout: 60000,
}, async (t) => {
  let proxy = await tunnelProxy();
  t.after(() => proxy.close());
  let f = await publicConnectorFixture(t, proxy.origin);
  proxy.setTarget(f.runtime.record.url || '');
  await f.runtime.insert(`<p id="fixture">Public connector fixture</p>
<script type="module" data-agui>
export default (root, api) => { window.publicConnectorTest = api; };
</script>`);
  let exposed = await f.expose();
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
    acceptInsecureCerts: true,
    args: [
      '--host-resolver-rules=MAP agui-test.trycloudflare.com 127.0.0.1',
      '--no-proxy-server',
    ],
  });
  f.cleanup(() => browser.close());
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${proxy.origin}/backend/`);
  await page.waitForFunction(() => !!Reflect.get(window, 'publicConnectorTest'));
  /** @param {import('puppeteer').Page} target */
  let connected = async (target) => target.waitForFunction(async () => {
    let { PubSub } = await import(new URL('/client/index.js', location.href).href);
    return PubSub.getCtx('AGUI_CONNECTORS').read('connected');
  });
  let requestId = randomUUID();
  let before = await page.evaluate((id) => Reflect.get(window, 'publicConnectorTest').callConnector('save', {
    value: 'allowed',
  }, {
    requestId: id,
  }), requestId);
  assert.equal(before.code, 'NOT_AVAILABLE');
  assert.equal(await page.evaluate((token) => Reflect.get(window, 'publicConnectorTest').authorizeConnector('save', token), exposed.token), true);
  await connected(page);
  let result = await page.evaluate((id) => Reflect.get(window, 'publicConnectorTest').callConnector('save', {
    value: 'allowed',
  }, {
    requestId: id,
  }), requestId);
  assert.equal(result.state, 'completed');
  // Disconnect and restore the same document; authenticate again, never resubmit a write.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await connected(page);
  let recovered = await page.evaluate((id) => Reflect.get(window, 'publicConnectorTest').readConnectorReceipt('save', id), requestId);
  assert.deepEqual(recovered, result);
  let spectator = await browser.createBrowserContext();
  let viewer = await spectator.newPage();
  await viewer.goto(`${proxy.origin}/backend/?mode=viewer`);
  await viewer.waitForSelector('#agui-viewer');
  assert.equal(await viewer.evaluate(() => Reflect.get(window, 'publicConnectorTest')), undefined);
  assert.ok(!(await viewer.content()).includes(exposed.token));
  assert.equal(await viewer.evaluate(async (token) => {
    let { authorizeConnector } = await import(new URL('/client/index.js', location.href).href);
    return authorizeConnector('save', token);
  }, exposed.token), false);
  let contextJson = await page.evaluate(async () => {
    let { PubSub } = await import(new URL('/client/index.js', location.href).href);
    return JSON.stringify(PubSub.getCtx('AGUI_CONNECTORS').read('current'));
  });
  assert.ok(!contextJson.includes(exposed.token));
  await f.runtime.connectorControl({
    instanceId: f.runtime.record.instanceId,
    change: {
      command: 'unexpose',
      action: 'save',
    },
  });
  await page.waitForFunction(async () => {
    let { PubSub } = await import(new URL('/client/index.js', location.href).href);
    return !PubSub.getCtx('AGUI_CONNECTORS').read('connected');
  });
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 1);
  assert.deepEqual(errors, []);
});
