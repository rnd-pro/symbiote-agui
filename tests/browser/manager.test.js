import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { cli } from './helpers.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { setSessionMetadata } from '../../src/metadata/service.js';
import { sampleMetadata } from '../node/metadata-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} name
 */
async function action(page, name) {
  let buttons = await page.$$('[data-session="desk"] button');
  for (let button of buttons) {
    if (await button.evaluate((element) => element.textContent) === name) { await button.click(); return; }
  }
  throw new Error(`Missing action: ${name}`);
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
  await page.waitForSelector('dialog[open]');
  assert.match(await page.$eval('dialog pre', (element) => element.textContent || ''), /Initial source: json-file \(sample-inventory.json\)/);
  await page.click('dialog button');
  assert.equal(page.url(), manager.url, 'Bootstrap removes the credential from the URL.');
  assert.equal(await page.title(), 'AGUI Manager');
  assert.equal(await page.$eval('link[rel="icon"]', async (element) => {
    let image = new Image();
    image.src = element.getAttribute('href') || '';
    await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0;
  }), true);
  assert.match(await page.$eval('.counts', (element) => element.textContent || ''), /1 total \/ 0 running \/ 1 stopped/);
  assert.ok(await page.$('agui-header[floating] + agui-dashboard'));
  assert.ok(await page.$('agui-field[type="search"] input'));
  assert.ok(await page.$('agui-select[name="status"] .agui-select-chevron'));
  await page.select('agui-select[name="status"] select', 'running');
  await page.waitForFunction(() => document.querySelectorAll('agui-session-row').length === 0);
  await page.select('agui-select[name="status"] select', 'all');
  await page.waitForSelector('[data-session="desk"]');
  assert.equal(await page.$eval('#manager-theme input', (element) => element.checked), false);
  await page.click('#manager-theme input');
  await page.reload();
  await page.waitForSelector('[data-session="desk"]');
  let second = await browser.newPage();
  await second.goto(manager.url);
  await second.waitForSelector('[data-session="desk"]');
  assert.equal(await second.$eval('#manager-theme input', (element) => element.checked), true);
  await second.click('#manager-theme input');
  await page.bringToFront();
  await page.waitForFunction(() => document.body.dataset.theme === 'light');
  assert.equal(await page.$eval('#manager-theme input', (element) => element.checked), false, 'Changes in another tab update the selection.');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.click('#system-theme');
  assert.equal(await page.evaluate(() => localStorage.getItem('agui-manager-theme')), null);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.reload();
  await page.waitForSelector('[data-session="desk"]');
  await action(page, 'Start');
  await notice(page, 'start completed');
  await page.waitForFunction(() => document.querySelector('.counts')?.textContent?.includes('1 running'));
  let pid = (await cli('status', 'desk')).pid;
  await action(page, 'Description');
  await page.waitForSelector('dialog[open]');
  assert.match(await page.$eval('dialog pre', (element) => element.textContent || ''), /Interactive workspace for desk/);
  await page.click('dialog button');
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
  await page.waitForFunction(() => [...document.querySelectorAll('[data-session="desk"] button')].some((button) => button.textContent === 'Retry tunnel' && !button.hasAttribute('disabled')));
  assert.equal((await cli('status', 'desk')).pid, pid);
  await fixture.setMode('ready');
  await action(page, 'Retry tunnel');
  await notice(page, 'share completed');
  await page.waitForSelector('[data-session="desk"] a[href*="trycloudflare.com"]');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-session="desk"] button')].some((button) => button.textContent === 'Tunnel attached' && button.hasAttribute('disabled')));
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
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.screenshot({ path: process.env.AGUI_MANAGER_SCREENSHOT, fullPage: true });
  }
  await page.setViewport({ width: 390, height: 844 });
  if (process.env.AGUI_MANAGER_SCREENSHOT) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${process.env.AGUI_MANAGER_SCREENSHOT}.mobile.png`, fullPage: true });
  }
  await page.setViewport({ width: 1100, height: 900 });
  await page.type('input[type="search"]', 'not-present');
  await page.waitForFunction(() => document.querySelectorAll('agui-session-row').length === 0);
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
  await page.waitForFunction(() => document.querySelector('.connection')?.textContent === 'Connected', { timeout: 12_000 });
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
