import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { cli, cliToolCall, insertStdin } from './helpers.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { isProcessAlive } from '../../src/sessions/store.js';
import { tunnelProxy } from './tunnel-proxy.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('HTTPS tunnel pages authorize, load same-origin assets, and remain controllable through the CLI', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires an installed Chrome and the POSIX connector fixture.' : false,
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  let proxy = await tunnelProxy();
  let fixture = await tunnelFixture(state.directory, proxy.origin);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await cli('stop', 'tunnel-ui').catch(() => {});
    await browser?.close();
    await proxy.close();
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'tunnel-ui', '--tunnel', '--no-open');
  proxy.setTarget(session.url);
  await insertStdin('tunnel-ui', [
    '<agui-component id="counter" class="block w-[321px]">',
    '<script type="application/json">{"count":0,"increment":null}</script>',
    '<button bind="onclick: increment">Count: {{count}}</button>',
    '</agui-component>',
    '<script type="module" data-agui>',
    'export default (root, { emit }) => {',
    '  let counter = root.querySelector("#counter");',
    '  counter.set$({ increment: () => { counter.$.count += 1; emit("count", { count: counter.$.count }); } });',
    '};',
    '</script>',
  ].join('\n'));
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    acceptInsecureCerts: true,
    args: ['--host-resolver-rules=MAP agui-test.trycloudflare.com 127.0.0.1', '--no-proxy-server', '--disable-blink-features=WebMCP,WebMCPTesting'],
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.publicUrl);
  await page.waitForFunction(() => document.getElementById('agui-connection')?.textContent?.includes('authorization required'));
  assert.deepEqual((await cli('pages', 'tunnel-ui')).pages, []);
  await page.goto(session.publicAuthorizationUrl);
  await page.waitForSelector('#counter button');
  assert.equal(page.url(), session.publicUrl);
  assert.equal(await page.$eval('#counter', (element) => getComputedStyle(element).width), '321px');
  assert.equal(await page.$eval('#agui-styles', (element) => new URL(/** @type {HTMLLinkElement} */ (element).href).origin), proxy.origin);
  assert.equal(await page.evaluate(() => typeof Reflect.get(document, 'modelContext')), 'undefined');
  let cookies = await page.browserContext().cookies();
  let cookie = cookies.find((cookie) => cookie.name.startsWith('agui-'));
  assert.ok(cookie);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, 'Strict');
  assert.equal(cookie.path, '/tunnel-ui/');
  let discovery = await cli('tools', 'tunnel-ui');
  assert.equal((await cli('pages', 'tunnel-ui')).pages[0].url, session.publicUrl);
  let local = await browser.newPage();
  await local.goto(session.authorizationUrl);
  await local.waitForSelector('#counter button');
  let call = { sessionId: 'tunnel-ui', pageId: discovery.pageId, discoveryId: discovery.discoveryId, name: 'increment_in_agui-component', input: {} };
  assert.equal((await cliToolCall('call_tool', call)).isError, false);
  assert.equal(await page.$eval('#counter button', (element) => element.textContent), 'Count: 1');
  assert.equal(await local.$eval('#counter button', (element) => element.textContent), 'Count: 0');
  assert.deepEqual((await cli('events', 'tunnel-ui')).events.map((/** @type {import('../../types/transport.js').SessionEvent} */ event) => event.data), [{ count: 1 }]);
  await page.reload();
  await page.waitForSelector('#counter button');
  assert.equal(await page.$eval('#counter button', (element) => element.textContent), 'Count: 0');
  assert.equal((await cliToolCall('call_tool', call)).isError, true);
  let denied = await page.evaluate(async () => (await fetch('/status')).status);
  assert.equal(denied, 404);
  let [pid] = await fixture.pids();
  await cli('stop-all');
  await page.waitForFunction(() => document.getElementById('agui-connection')?.textContent === 'Session ended.');
  assert.equal(isProcessAlive(pid), false);
  assert.deepEqual(errors, []);
});
