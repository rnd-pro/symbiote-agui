import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { cli, cliToolCall, insertStdin, sendStdin, hasCliError } from './helpers.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { isProcessAlive } from '../../src/sessions/store.js';
import { tunnelProxy } from './tunnel-proxy.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

/**
 * @param {import('puppeteer-core').Page} page
 * @param {number} count
 */
async function waitForMirror(page, count) {
  await page.waitForFunction((expected) => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#counter button')?.textContent === 'Count: ' + expected;
  }, {}, count);
}

test('public links elect one user and deliver a live read-only mirror to other browsers', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
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
    '<input id="notes" aria-label="Notes" value="hello">',
    '<input id="flag" aria-label="Flag" type="checkbox">',
    '</agui-component>',
    '<script type="module" data-agui>',
    'Reflect.set(window, "aguiRuns", (Reflect.get(window, "aguiRuns") || 0) + 1);',
    'export default (root, { emit }) => {',
    '  let counter = root.querySelector("#counter");',
    '  counter.set$({ increment: () => { counter.$.count += 1; emit("count", { count: counter.$.count }); } });',
    '};',
    '</script>',
  ].join('\n'));
  browser = await puppeteer.launch({
    executablePath, headless: true, acceptInsecureCerts: true,
    args: ['--host-resolver-rules=MAP agui-test.trycloudflare.com 127.0.0.1', '--no-proxy-server', '--disable-blink-features=WebMCP,WebMCPTesting'],
  });
  let spectatorContext = await browser.createBrowserContext();
  let viewer = await spectatorContext.newPage();
  await viewer.goto(session.publicViewerUrl);
  await viewer.waitForFunction(() => document.getElementById('agui-connection')?.textContent?.includes('waiting for the user'));
  assert.equal(await viewer.evaluate(() => Reflect.get(window, 'aguiRuns')), undefined);
  let page = await browser.newPage();
  /** @type {string[]} */
  let requests = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.publicUrl);
  await page.waitForSelector('#counter button');
  await waitForMirror(viewer, 0);
  assert.equal(page.url(), session.publicUrl);
  assert.equal(await page.title(), 'tunnel-ui');
  assert.equal(await viewer.title(), 'tunnel-ui');
  let icon = await page.$eval('link[rel="icon"]', (element) => element.getAttribute('href'));
  assert.equal(await viewer.$eval('link[rel="icon"]', (element) => element.getAttribute('href')), icon);
  assert.equal(await page.$eval('#counter', (element) => getComputedStyle(element).width), '321px');
  assert.equal(await page.evaluate(() => typeof Reflect.get(document, 'modelContext')), 'undefined');
  assert.deepEqual(await page.browserContext().cookies(), []);
  assert.equal(requests.some((path) => path.endsWith('/authorize')), false);
  let discovery = await cli('tools', 'tunnel-ui');
  let pages = (await cli('pages', 'tunnel-ui')).pages;
  assert.ok(pages.every((/** @type {import('../../types/tools.js').ConnectedPage} */ item) => item.title === 'tunnel-ui'));
  assert.deepEqual(pages.map((/** @type {import('../../types/tools.js').ConnectedPage} */ item) => item.role), ['viewer', 'user']);
  let viewerId = pages.find((/** @type {import('../../types/tools.js').ConnectedPage} */ item) => item.role === 'viewer').pageId;
  await assert.rejects(cli('tools', 'tunnel-ui', '--page', viewerId), (error) => hasCliError(error, 'PAGE_UNAVAILABLE'));
  let call = { sessionId: 'tunnel-ui', pageId: discovery.pageId, discoveryId: discovery.discoveryId, name: 'increment_in_agui-component', input: {} };
  assert.equal((await cliToolCall('call_tool', call)).isError, false);
  await waitForMirror(viewer, 1);
  await page.click('#counter button');
  await waitForMirror(viewer, 2);
  await page.click('#notes', { count: 3 });
  await page.type('#notes', 'hello world');
  await page.click('#flag');
  assert.equal(await page.$eval('input#notes', (element) => element.value), 'hello world');
  assert.equal(await page.$eval('input#flag', (element) => element.checked), true);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    let notes = /** @type {HTMLInputElement | null} */ (frame?.contentDocument?.getElementById('notes'));
    let flag = /** @type {HTMLInputElement | null} */ (frame?.contentDocument?.getElementById('flag'));
    return notes?.value === 'hello world' && flag?.checked;
  });
  let frame = await (await viewer.$('#agui-viewer'))?.contentFrame();
  assert.ok(frame);
  assert.equal(await frame.evaluate(() => document.body.inert), true);
  assert.equal(await frame.evaluate(() => Reflect.get(window, 'aguiRuns')), undefined);
  assert.equal(await frame.evaluate(() => customElements.get('agui-component')), undefined);
  assert.equal(await frame.$eval('#counter', (element) => getComputedStyle(element).width), '321px');
  await frame.click('#counter button');
  assert.equal(await page.$eval('#counter button', (element) => element.textContent), 'Count: 2');
  let lateContext = await browser.createBrowserContext();
  let late = await lateContext.newPage();
  await late.goto(session.publicUserUrl);
  await waitForMirror(late, 2);
  assert.equal(await late.evaluate(() => Reflect.get(window, 'aguiRuns')), undefined);
  assert.equal((await cli('tools', 'tunnel-ui')).pageId, discovery.pageId);
  await late.reload();
  await waitForMirror(late, 2);
  assert.equal(await late.title(), 'tunnel-ui');
  assert.equal(await late.$eval('link[rel="icon"]', (element) => element.getAttribute('href')), icon);
  assert.equal(await late.evaluate(() => Reflect.get(window, 'aguiRuns')), undefined);
  await sendStdin('update', 'tunnel-ui', JSON.stringify({ selector: '#counter', values: { count: 9 } }));
  await waitForMirror(viewer, 9);
  await waitForMirror(late, 9);
  let events = (await cli('events', 'tunnel-ui')).events;
  assert.deepEqual(events.map((/** @type {import('../../types/transport.js').SessionEvent} */ event) => event.data), [{ count: 1 }, { count: 2 }]);
  await page.reload();
  await page.waitForSelector('#counter button');
  await waitForMirror(viewer, 0);
  assert.equal((await cliToolCall('call_tool', call)).isError, true);
  assert.equal((await cli('pages', 'tunnel-ui')).pages.filter((/** @type {import('../../types/tools.js').ConnectedPage} */ item) => item.role === 'user').length, 1);
  assert.equal(await page.evaluate(async () => (await fetch('/status')).status), 404);
  await page.goto('about:blank');
  await viewer.waitForFunction(() => document.getElementById('agui-connection')?.textContent?.includes('waiting for the user'));
  await late.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await late.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await late.waitForSelector('#counter button');
  let handoff = await cli('tools', 'tunnel-ui');
  assert.notEqual(handoff.pageId, discovery.pageId);
  await late.click('#counter button');
  await waitForMirror(viewer, 1);
  await page.goto(session.publicUserUrl);
  await waitForMirror(page, 1);
  assert.equal(await page.title(), 'tunnel-ui');
  assert.equal(await page.$eval('link[rel="icon"]', (element) => element.getAttribute('href')), icon);
  assert.equal(await page.evaluate(() => Reflect.get(window, 'aguiRuns')), undefined);
  assert.deepEqual(await late.browserContext().cookies(), []);
  let [pid] = await fixture.pids();
  await cli('clear', 'tunnel-ui');
  await viewer.waitForFunction(() => {
    let iframe = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return iframe?.contentDocument?.getElementById('mirror-content')?.childElementCount === 0;
  });
  await cli('stop-all');
  await viewer.waitForFunction(() => document.getElementById('agui-connection')?.textContent === 'Session ended.');
  assert.equal(isProcessAlive(pid), false);
  assert.deepEqual(errors, []);
});

test('sharing existing local tabs retires viewer modules and releases the user slot for the next connection', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await cli('stop', 'local-share').catch(() => {});
    await browser?.close();
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'local-share', '--no-open');
  await insertStdin('local-share', [
    '<agui-component id="counter"><script type="application/json">{"count":0,"increment":null}</script>',
    '<button bind="onclick: increment">Count: {{count}}</button></agui-component>',
    '<script type="module" data-agui>',
    'Reflect.set(window, "aguiRuns", true);',
    'export default (root) => { let c = root.querySelector("#counter"); c.set$({ increment: () => { c.$.count += 1; } }); };',
    '</script>',
  ].join('\n'));
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-blink-features=WebMCP,WebMCPTesting'] });
  let user = await browser.newPage();
  await user.goto(session.url);
  await user.waitForSelector('#counter button');
  let context = await browser.createBrowserContext();
  let viewer = await context.newPage();
  await viewer.goto(session.url);
  await viewer.waitForSelector('#counter button');
  await user.click('#counter button');
  assert.equal(await viewer.$eval('#counter button', (element) => element.textContent), 'Count: 0');
  await cli('share', 'local-share');
  await waitForMirror(viewer, 1);
  assert.equal(await user.title(), 'local-share');
  assert.equal(await viewer.title(), 'local-share');
  assert.equal(await user.$eval('link[rel="icon"]', (element) => element.getAttribute('href')),
    await viewer.$eval('link[rel="icon"]', (element) => element.getAttribute('href')));
  assert.equal(await viewer.evaluate(() => Reflect.get(window, 'aguiRuns')), undefined);
  assert.equal(await viewer.$('#counter'), null);
  await user.close();
  await viewer.waitForFunction(() => document.getElementById('agui-connection')?.textContent?.includes('waiting for the user'));
  await waitForMirror(viewer, 1);
  await assert.rejects(cli('tools', 'local-share'), (error) => hasCliError(error, 'PAGE_UNAVAILABLE'));
  await assert.rejects(sendStdin('update', 'local-share', JSON.stringify({ selector: '#counter', values: { count: 4 } })), (error) => hasCliError(error, 'PAGE_UNAVAILABLE'));
  let queued = await insertStdin('local-share', '<p id="replacement">Replacement while user was away</p>');
  assert.equal(queued.delivery, 'queued');
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.getElementById('mirror-content')?.childElementCount === 0;
  });
  let freshContext = await browser.createBrowserContext();
  let reconnected = await freshContext.newPage();
  await reconnected.goto(session.url);
  await reconnected.waitForSelector('#replacement');
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.getElementById('replacement')?.textContent === 'Replacement while user was away';
  });
  assert.equal((await cli('pages', 'local-share')).pages.filter((/** @type {import('../../types/tools.js').ConnectedPage} */ page) => page.role === 'user').length, 1);
});
