import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { cli } from './helpers.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { temporaryManagerProject } from '../node/manager-storage-fixture.js';
import { setSessionMetadata } from '../../src/metadata/service.js';
import { sampleMetadata } from '../node/metadata-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('manager save-folder controls persist the project setting and open the selected scope', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45_000,
}, async (t) => {
  let project = await temporaryManagerProject();
  let folder = join(project.projectDirectory, 'saved interfaces');
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await project.cli([
      'manager',
      'stop',
    ], folder).catch(() => {});
    await project.close();
  });
  let htmlPath = join(project.directory, 'saved.html');
  await writeFile(htmlPath, '<h1>Original cache</h1>');
  await project.cli([
    'save',
    'original',
    '--file',
    htmlPath,
  ]);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  let page = await browser.newPage();
  await page.goto(manager.launchUrl);
  await page.waitForSelector('[data-session="original"]');
  await page.locator('::-p-aria([name="Settings"][role="button"])').click();
  await page.type('agui-field[name="saveFolder"] input', './saved interfaces');
  let navigation = page.waitForNavigation();
  await page.locator('::-p-aria([name="Save folder and open"][role="button"])').click();
  await navigation;
  await page.waitForFunction((selected) => document.querySelector('#manager-project-navigation')?.textContent?.includes(selected), {}, folder);
  assert.notEqual(page.url(), manager.url);
  assert.equal(await page.$('[data-session="original"]'), null, 'Source definitions are not silently copied to the new scope.');
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('agui-field[name="saveFolder"] input')?.hasAttribute('disabled'));
  await page.locator('::-p-aria([name="Settings"][role="button"])').click();
  assert.equal(await page.$eval('agui-field[name="saveFolder"] input', (element) => element.value), folder);
  assert.equal((await project.cli([
    'config',
    'show',
  ])).settings.folder, folder);
  navigation = page.waitForNavigation();
  await page.locator('::-p-aria([name="Use default cache"][role="button"])').click();
  await navigation;
  await page.waitForSelector('[data-session="original"]');
  assert.equal(page.url(), manager.url);
  assert.equal((await project.cli([
    'config',
    'show',
  ])).settings.folder, undefined);
});

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} name
 */
async function action(page, name) {
  await page.click('#session-views [role="tab"][value="cards"]');
  await page.click('.sessions [data-session="desk"] .manager-session-select');
  await page.locator(`#session-inspector [data-session="desk"] ::-p-aria([name="${name}"][role="button"])`).click();
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} text
 */
async function notice(page, text) {
  await page.waitForFunction((expected) => document.querySelector('.notice')?.textContent?.includes(expected), {}, text);
}

test('built-in manager populates new tabs and directly manages sessions, descriptions and tunnels', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX tunnel fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'all').catch(() => {});
    await cli('manager', 'stop').catch(() => {});
    fixture.close();
    await state.close();
  });
  let source = join(state.directory, 'desk.html');
  await writeFile(source, '<h1>Original definition</h1>');
  await cli('save', 'desk', '--file', source);
  await setSessionMetadata('desk', sampleMetadata());
  let manager = await cli('manager', '--no-open');
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-blink-features=WebMCP,WebMCPTesting'] });
  let page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  page.setDefaultTimeout(7_000);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => { errors.push(String(error)); t.diagnostic(String(error)); });
  await page.goto(manager.launchUrl);
  await page.waitForSelector('[data-session="desk"]');
  assert.match(await page.$eval('[data-session="desk"] .data-flow', (element) => element.textContent || ''), /demo.inventory/);
  await action(page, 'Description');
  await page.waitForSelector('#manager-description agui-markdown h1');
  assert.match(await page.$eval('#manager-description agui-markdown article', (element) => element.textContent || ''), /Initial source: json-file \(sample-inventory.json\)/);
  await page.click('#manager-description dialog button');
  assert.equal(page.url(), manager.url, 'Bootstrap removes the credential from the URL.');
  assert.equal(await page.title(), 'AGUI Manager');
  assert.equal(await page.$eval('link[rel="icon"]', async (element) => {
    let image = new Image();
    image.src = element.getAttribute('href') || '';
    await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0;
  }), true);
  assert.match(await page.$eval('.counts', (element) => element.textContent || ''), /1 total \/ 0 running \/ 1 stopped/);
  assert.ok(await page.$('agui-app > agui-viewport #session-views'));
  assert.ok(await page.$('#manager-filter input[type="search"]'));
  assert.ok(await page.$('#manager-filter [data-field="status"] select'));
  await page.select('#manager-filter [data-field="status"] select', 'running');
  await page.waitForFunction(() => document.querySelectorAll('.sessions agui-session-row').length === 0);
  await page.select('#manager-filter [data-field="status"] select', '');
  await page.waitForSelector('[data-session="desk"]');
  assert.equal(await page.$eval('#manager-theme button', (element) => element.getAttribute('aria-pressed') === 'true'), false);
  await page.click('#manager-theme button');
  await page.reload();
  await page.waitForSelector('[data-session="desk"]');
  let second = await browser.newPage();
  await second.goto(manager.url);
  await second.waitForSelector('[data-session="desk"]');
  assert.equal(await second.$eval('#manager-theme button', (element) => element.getAttribute('aria-pressed') === 'true'), true);
  await second.click('#manager-theme button');
  await page.bringToFront();
  await page.waitForFunction(() => document.body.dataset.theme === 'light');
  assert.equal(await page.$eval('#manager-theme button', (element) => element.getAttribute('aria-pressed') === 'true'), false, 'Changes in another tab update the selection.');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  assert.equal(await page.$('#system-theme'), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('agui-manager-theme')), 'light');
  assert.equal(await page.$eval('#manager-theme button', (element) => element.getAttribute('aria-pressed') === 'true'), false, 'An explicit theme remains selected when the OS preference changes.');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.reload();
  await page.waitForSelector('[data-session="desk"]');
  await page.click('#session-views [role="tab"][value="table"]');
  await page.click('#manager-table tr[data-row-id="desk"] td[data-column="id"]');
  await page.waitForSelector('#session-inspector [data-session="desk"]');
  await page.locator('#session-inspector ::-p-aria([name="Start"][role="button"])').click();
  await notice(page, 'start completed');
  assert.equal(await page.$eval('#manager-table input[type="radio"]', (element) => element.checked), true, 'Snapshot refresh preserves the selected session.');
  await page.click('#session-views [role="tab"][value="cards"]');
  await page.waitForFunction(() => document.querySelector('.counts')?.textContent?.includes('1 running'));
  let pid = (await cli('status', 'desk')).pid;
  await action(page, 'Description');
  await page.waitForSelector('#manager-description agui-markdown h1');
  assert.match(await page.$eval('#manager-description agui-markdown article', (element) => element.textContent || ''), /Interactive workspace for desk/);
  await page.click('#manager-description dialog button');
  let savedPath = (await cli('describe', 'desk')).htmlPath;
  await writeFile(savedPath, '<h1>Updated definition</h1><input id="notes" aria-label="Notes">');
  page.once('dialog', (dialog) => { void dialog.accept(); });
  await action(page, 'Sync');
  await notice(page, 'sync completed');
  assert.equal((await cli('status', 'desk')).pid, pid);
  let running = await cli('status', 'desk');
  let local = await browser.newPage();
  await local.goto(running.url);
  await local.waitForSelector('#notes');
  await local.type('#notes', 'Keep this live input');
  await page.bringToFront();
  await fixture.setMode('fail');
  await action(page, 'Attach tunnel');
  await notice(page, 'Expected tunnel fixture failure');
  await page.locator('#session-inspector [data-session="desk"] ::-p-aria([name="Retry tunnel"][role="button"])').filter((button) => !button.hasAttribute('disabled')).wait();
  assert.equal((await cli('status', 'desk')).pid, pid);
  await fixture.setMode('ready');
  await action(page, 'Retry tunnel');
  await notice(page, 'share completed');
  await page.waitForSelector('[data-session="desk"] a[href*="trycloudflare.com"]');
  await page.locator('#session-inspector [data-session="desk"] ::-p-aria([name="Tunnel attached"][role="button"])').filter((button) => button.hasAttribute('disabled')).wait();
  let shared = await cli('status', 'desk');
  assert.equal(shared.pid, pid, 'Attaching a tunnel preserves the running worker.');
  assert.equal(shared.url, running.url, 'The local session URL does not change.');
  assert.equal(await local.$eval('input#notes', (element) => element.value), 'Keep this live input');
  assert.equal(await page.$eval('[data-session="desk"] a[href$="?mode=viewer"]', (element) => element.getAttribute('href')), shared.publicViewerUrl);
  await action(page, 'Check tunnel');
  await notice(page, 'tunnel check completed');
  await page.waitForFunction(() => document.querySelector('[data-session="desk"]')?.textContent?.includes('reachable; checked'));
  await fixture.setActivity('disabled');
  await action(page, 'Check tunnel');
  await notice(page, 'HTTP 503');
  await fixture.setActivity('ready');
  await fixture.setOrigin('https://renewed-manager.trycloudflare.com');
  page.once('dialog', (dialog) => { void dialog.accept(); });
  await action(page, 'Renew tunnel');
  await notice(page, 'tunnel renew completed');
  await page.waitForSelector('a[href*="renewed-manager.trycloudflare.com"]');
  let connectors = (await fixture.pids()).length;
  await fixture.setMode('slow-ready');
  await fixture.setOrigin('https://reconnected-manager.trycloudflare.com');
  await page.evaluate(() => {
    let connection = Reflect.get(document.querySelector('agui-session-manager') || {}, 'connection');
    let socket = /** @type {WebSocket} */ (connection.socket);
    let send = socket.send.bind(socket);
    socket.send = (data) => {
      send(data);
      if (typeof data === 'string' && JSON.parse(data).operation === 'tunnel renew') { socket.close(); }
    };
  });
  page.once('dialog', (dialog) => { void dialog.accept(); });
  await action(page, 'Renew tunnel');
  await notice(page, 'outcome may be unknown');
  await page.waitForSelector('a[href*="reconnected-manager.trycloudflare.com"]');
  assert.equal((await fixture.pids()).length, connectors + 1, 'A disconnected renewal is accepted once and never replayed.');
  if (process.env.AGUI_MANAGER_SCREENSHOT) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.screenshot({ path: `${process.env.AGUI_MANAGER_SCREENSHOT}.light.png`, fullPage: true });
    await page.click('#manager-theme button');
    await page.screenshot({ path: process.env.AGUI_MANAGER_SCREENSHOT, fullPage: true });
  }
  await page.setViewport({ width: 390, height: 844 });
  if (process.env.AGUI_MANAGER_SCREENSHOT) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${process.env.AGUI_MANAGER_SCREENSHOT}.mobile.png`, fullPage: true });
  }
  await page.setViewport({ width: 1100, height: 900 });
  await page.type('input[type="search"]', 'not-present');
  await page.waitForFunction(() => document.querySelectorAll('.sessions agui-session-row').length === 0);
  await page.$eval('input[type="search"]', (element) => { element.value = ''; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForSelector('[data-session="desk"]');
  await page.select('agui-select[name="operation"] select', 'stop');
  await page.click('.bulk button');
  await notice(page, 'stop completed');
  await second.bringToFront();
  await second.waitForFunction(() => document.querySelector('.counts')?.textContent?.includes('1 stopped'), { timeout: 12_000 });
  await page.bringToFront();
  await page.click('.toolbar button');
  await page.waitForFunction(() => document.querySelector('.counts')?.textContent?.includes('1 stopped'));
  page.once('dialog', (dialog) => { void dialog.dismiss(); });
  await action(page, 'Clear');
  assert.equal((await cli('list')).total, 1);
  page.once('dialog', (dialog) => { void dialog.accept(); });
  await action(page, 'Clear');
  await notice(page, 'clear completed');
  await page.waitForFunction(() => document.querySelector('.counts')?.textContent?.includes('0 total'));
  assert.equal((await cli('list')).total, 0);
  assert.equal((await cli('manager', 'status')).active, true);
  assert.deepEqual(errors, []);
});

test('manager disconnects reconcile status without replaying a mutation; generated pages have no management access', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 40_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'all').catch(() => {});
    await cli('manager', 'stop').catch(() => {});
    await state.close();
  });
  await writeFile(join(state.directory, 'desk.html'), '<h1>Desk</h1>');
  await cli('save', 'desk', '--file', join(state.directory, 'desk.html'));
  let manager = await cli('manager', '--no-open');
  browser = await puppeteer.launch({ executablePath, headless: true });
  let page = await browser.newPage();
  await page.goto(manager.launchUrl);
  await page.waitForSelector('[data-session="desk"]');
  let protocol = await page.createCDPSession();
  await protocol.send('Network.enable');
  let session = await cli('start', 'desk', '--no-open');
  await protocol.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await page.evaluate(() => Reflect.get(document.querySelector('agui-session-manager') || {}, 'connection').socket.close());
  await page.waitForFunction(() => document.querySelector('.connection')?.textContent?.includes('Disconnected'));
  await cli('stop', 'desk');
  await protocol.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.waitForFunction(() => document.querySelector('.connection .agui-message-text')?.textContent === 'Connected', { timeout: 12_000 });
  await page.waitForFunction(() => document.querySelector('.counts')?.textContent?.includes('1 stopped'));
  await action(page, 'Start');
  await notice(page, 'start completed');
  session = await cli('status', 'desk');
  let generated = await browser.newPage();
  await generated.goto(session.url);
  let allowed = await generated.evaluate((managerUrl) => new Promise((resolve) => {
    let socket = new WebSocket(managerUrl.replace('http:', 'ws:') + 'socket');
    socket.addEventListener('open', () => { socket.close(); resolve(true); });
    socket.addEventListener('error', () => resolve(false));
  }), manager.url);
  assert.equal(allowed, false);
  assert.equal(await generated.evaluate(() => localStorage.getItem('agui-manager-token')), null);
  let isolated = await browser.createBrowserContext();
  let unauthorized = await isolated.newPage();
  await unauthorized.goto(manager.url);
  await unauthorized.waitForFunction(() => document.querySelector('.connection')?.textContent?.includes('launchUrl'));
  assert.equal(await unauthorized.$('[data-session="desk"]'), null);
  await isolated.close();
});

test('cards and selectable table rows share session selection and inspector actions target only the selected session', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 35_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'all').catch(() => {});
    await cli('manager', 'stop').catch(() => {});
    await state.close();
  });
  let source = join(state.directory, 'session.html');
  await writeFile(source, '<h1>Selection fixture</h1>');
  await cli('save', 'alpha', '--file', source);
  await cli('save', 'beta', '--file', source);
  let alpha = await cli('describe', 'alpha');
  await writeFile(alpha.descriptionPath, '# Alpha notes\n\n**Prepared description**\n\n```js\nlet ready = true;\n```\n\n<x-manager-description-probe>\n\nFallback document text\n\n</x-manager-description-probe>\n\n<script>window.descriptionAttack = true;</script>');
  let manager = await cli('manager', '--no-open');
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  let page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Reflect.set(window, 'descriptionProbeCount', 0);
    customElements.define('x-manager-description-probe', class extends HTMLElement {
      constructor() {
        super();
        Reflect.set(window, 'descriptionProbeCount', Reflect.get(window, 'descriptionProbeCount') + 1);
      }
    });
  });
  await page.goto(manager.launchUrl);
  await page.waitForSelector('.sessions [data-session="alpha"]');
  assert.equal(await page.$eval('#session-inspector', (element) => Reflect.get(element, 'hidden')), true);
  assert.equal(await page.$('.sessions [aria-label="Session actions"]'), null);
  assert.equal(await page.$eval('#session-views [role="tab"]', (element) => element.getAttribute('value')), 'table');
  assert.equal(await page.$eval('#session-views [role="tab"][value="table"]', (element) => element.getAttribute('aria-selected')), 'true');
  await page.click('#session-views [role="tab"][value="cards"]');
  await page.click('.sessions [data-session="alpha"] summary');
  assert.equal(await page.$eval('#session-inspector', (element) => Reflect.get(element, 'hidden')), true, 'Opening a description does not select the card.');
  await page.focus('.sessions [data-session="alpha"] .manager-session-select');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#session-inspector [data-session="alpha"]');
  await page.locator('#session-inspector ::-p-aria([name="Description"][role="button"])').click();
  await page.waitForSelector('#manager-description agui-markdown strong');
  assert.equal(await page.$eval('#manager-description strong', (element) => element.textContent), 'Prepared description');
  assert.ok(await page.$('#manager-description code.language-js .hljs-keyword'));
  assert.equal(await page.$('#manager-description x-manager-description-probe, #manager-description script'), null);
  assert.equal(await page.evaluate(() => Reflect.get(window, 'descriptionProbeCount')), 0, 'Descriptions cannot construct registered components in the privileged manager.');
  assert.notEqual(await page.evaluate(() => Reflect.get(window, 'descriptionAttack')), true);
  await page.click('#manager-description dialog button');
  let fallback = await browser.newPage();
  await fallback.evaluateOnNewDocument(() => { Reflect.deleteProperty(Element.prototype, 'setHTML'); });
  await fallback.goto(manager.launchUrl);
  await fallback.waitForSelector('#manager-table tr[data-row-id="alpha"] td[data-column=""] input');
  await fallback.click('#manager-table tr[data-row-id="alpha"] td[data-column="id"]');
  await fallback.locator('#session-inspector ::-p-aria([name="Description"][role="button"])').click();
  await fallback.waitForSelector('#manager-description strong');
  assert.equal(await fallback.$('#manager-description x-manager-description-probe, #manager-description script'), null);
  await fallback.close();
  await page.bringToFront();
  assert.equal(await page.$eval('.sessions [data-session="alpha"] .manager-session-select', (element) => element.getAttribute('aria-pressed')), 'true');
  await page.click('.sessions [data-session="beta"] code');
  await page.waitForSelector('#session-inspector [data-session="beta"]');
  await page.click('.sessions [data-session="alpha"] .manager-session-select');
  await page.click('#session-views [role="tab"][value="table"]');
  assert.equal(await page.$eval('#manager-table tr[data-row-id="alpha"] td[data-column=""] input', (element) => Reflect.get(element, 'checked')), true);
  await page.click('#manager-table tr[data-row-id="beta"] td[data-column="id"]');
  await page.waitForSelector('#session-inspector [data-session="beta"]');
  await page.focus('#manager-table tr[data-row-id="alpha"]');
  await page.keyboard.press('Space');
  await page.waitForSelector('#session-inspector [data-session="alpha"]');
  await page.focus('#manager-table tr[data-row-id="beta"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#session-inspector [data-session="beta"]');
  assert.deepEqual(await page.$eval('agui-session-manager', (element) => Reflect.get(element, '$').selection), [
    'beta',
  ]);
  assert.equal(await page.$eval('.sessions [data-session="alpha"] .manager-session-select', (element) => element.getAttribute('aria-pressed')), 'false');
  assert.equal(await page.$eval('.sessions [data-session="beta"] .manager-session-select', (element) => element.getAttribute('aria-pressed')), 'true');
  await page.locator('#session-inspector ::-p-aria([name="Start"][role="button"])').click();
  await notice(page, 'beta: start completed');
  assert.equal((await cli('status', 'alpha')).active, false);
  assert.equal((await cli('status', 'beta')).active, true);
  await page.type('#manager-filter input[type="search"]', 'alpha');
  await page.waitForFunction(() => !document.querySelector('#manager-table tr[data-row-id="beta"]'));
  assert.ok(await page.$('#session-inspector [data-session="beta"]'), 'Filtering does not silently switch the action target.');
  await cli('stop', 'beta');
  await cli('clear', 'beta');
  await page.click('.toolbar button');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#session-inspector') || {}, 'hidden') === true);
});
