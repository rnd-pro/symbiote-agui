import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli } from './helpers.js';
import { withStorageFolder } from '../../src/config/storage-scope.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { ensureSessionStarted } from '../../src/sessions/start.js';
import { stopSession } from '../../src/sessions/lifecycle.js';
import { TUNNEL_READY_TIMEOUT_MS } from '../../src/tunnel/constants.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('manager verifies public links and manages browsers and tunnels across projects without reconnecting disconnected tabs', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  let folder = join(state.directory, 'another-project');
  await mkdir(folder);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await stopSession('desk');
    await withStorageFolder(folder, () => stopSession('desk'));
    await cli('manager', 'stop').catch(() => {});
    fixture.close();
    await state.close();
  });
  for (let scope of [
    undefined,
    folder,
  ]) {
    await withStorageFolder(scope, async () => {
      let cache = await prepareCachedMarkup('desk', '<h1>Connection fixture</h1><input id="notes" aria-label="Notes">');
      try { await cache.commit(); } finally { await cache.discard(); }
      await ensureSessionStarted('desk', false);
    });
  }
  let shared = await cli('share', 'desk');
  let originalPid = (await cli('status', 'desk')).pid;
  let manager = await cli('manager', '--no-open');
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  /** @type {string[]} */
  let errors = [];
  browser.on('targetcreated', async (target) => {
    let page = await target.page();
    page?.on('pageerror', (error) => { errors.push(String(error)); });
  });
  let explicitViewer = await browser.newPage();
  await explicitViewer.goto(`${shared.url}?mode=viewer`);
  let user = await browser.newPage();
  await user.goto(shared.url);
  await user.waitForSelector('#notes');
  await user.type('#notes', 'Keep this draft');
  let second = await browser.newPage();
  await second.goto(shared.url);
  await second.waitForSelector('#agui-viewer');
  let initialPageIds = (await cli('pages', 'desk')).pages.map((/** @type {import('../../types/tools.js').ConnectedPage} */ entry) => entry.pageId);
  let page = await browser.newPage();
  await page.setViewport({
    width: 1250,
    height: 900,
  });
  await page.goto(manager.launchUrl);
  await page.waitForSelector('#manager-table tr[data-row-id="desk"]');
  // Keep the test off the public Internet while observing the real verified-open flow.
  await page.evaluate(() => {
    Reflect.set(window, 'open', () => ({
      closed: false,
      opener: null,
      document: {
        title: '',
        body: {
          textContent: '',
        },
      },
      location: {
        replace: (/** @type {string} */ url) => Reflect.set(window, 'verifiedOpenedUrl', url),
      },
      close: () => Reflect.set(window, 'reservedTabClosed', true),
    }));
  });
  await page.click('#manager-table tr[data-row-id="desk"] td[data-column="id"]');
  await page.waitForSelector('#session-inspector button[aria-label="Public link"]');
  let before = (await fixture.pids()).length;
  await fixture.setReadyAge(TUNNEL_READY_TIMEOUT_MS + 1);
  await fixture.setOrigin('https://manager-verified.trycloudflare.com');
  await fixture.delayActivity(1_500);
  await page.click('#session-inspector button[aria-label="Public link"]');
  await page.waitForFunction(() => Reflect.get(window, 'verifiedOpenedUrl') === 'https://manager-verified.trycloudflare.com/desk/');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'reservedTabClosed')), undefined, 'The reserved tab remains open while DNS settles after renewal.');
  assert.equal((await fixture.pids()).length, before + 1);
  assert.equal((await cli('status', 'desk')).pid, originalPid);
  assert.equal(await user.$eval('#notes', (element) => Reflect.get(element, 'value')), 'Keep this draft');
  await page.click('#session-views [role="tab"][value="cards"]');
  await page.click('.sessions button[aria-label="Viewer page"]');
  await page.waitForFunction(() => Reflect.get(window, 'verifiedOpenedUrl') === 'https://manager-verified.trycloudflare.com/desk/?mode=viewer');
  await page.click('#session-views [role="tab"][value="connections"]');
  await page.waitForFunction(() => document.querySelectorAll('[data-connection-session]').length === 2);
  assert.match(await page.$eval('agui-manager-connections', (element) => element.textContent || ''), /another-project/);
  assert.equal(await page.$$eval('[data-browser-connection]', (elements) => elements.length), 3);
  let pages = await cli('pages', 'desk');
  assert.deepEqual(pages.pages.map((/** @type {import('../../types/tools.js').ConnectedPage} */ entry) => entry.pageId), initialPageIds,
    'Opening duplicate tabs must not cause connection churn or reconnect loops.');
  assert.deepEqual(pages.pages.map((/** @type {import('../../types/tools.js').ConnectedPage} */ entry) => entry.role), [
    'viewer',
    'user',
    'viewer',
  ]);
  let userId = pages.pages.find((/** @type {import('../../types/tools.js').ConnectedPage} */ entry) => entry.role === 'user').pageId;
  page.once('dialog', (dialog) => { void dialog.accept(); });
  await page.click(`[data-browser-connection="${userId}"] button`);
  await page.waitForFunction((id) => !document.querySelector(`[data-browser-connection="${id}"]`), {}, userId);
  await user.waitForFunction(() => document.getElementById('agui-connection')?.getAttribute('message')?.includes('Disconnected by manager'));
  await user.evaluate(() => new Promise((resolve) => setTimeout(resolve, 750)));
  assert.equal((await cli('pages', 'desk')).pages.length, 2, 'An intentional disconnect does not automatically reconnect.');
  assert.equal(await user.$eval('#notes', (element) => Reflect.get(element, 'value')), 'Keep this draft');
  let replacement = await browser.newPage();
  await replacement.goto(shared.url);
  await replacement.waitForSelector('#notes');
  await page.bringToFront();
  let section = '[data-connection-session="default/desk"]';
  page.once('dialog', (dialog) => { void dialog.accept(); });
  await page.locator(`${section} ::-p-aria([name="Stop tunnel"][role="button"])`).click();
  await page.waitForFunction((selector) => document.querySelector(selector)?.textContent?.includes('Local only'), {}, section);
  let status = await cli('status', 'desk');
  assert.equal(status.pid, originalPid);
  assert.equal(status.publicUrl, undefined);
  assert.equal(await replacement.$eval('#notes', (element) => element.isConnected), true);
  assert.deepEqual(errors, []);
});
