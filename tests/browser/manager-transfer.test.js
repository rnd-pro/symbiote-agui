import assert from 'node:assert/strict';
import { chmod, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryManagerProject } from '../node/manager-storage-fixture.js';
import { writeTransferFixture } from '../node/transfer-fixture.js';
import { dataHtml } from '../node/data-fixture.js';
import { connectProject } from '../../src/projects/registry.js';
import { transferScope, transferPaths } from '../../src/projects/transfer/scope.js';
import { readTransferFiles } from '../../src/projects/transfer/snapshot.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

/** @param {import('node:test').TestContext} t */
async function fixture(t) {
  let project = await temporaryManagerProject();
  let aFolder = join(project.projectDirectory, 'a');
  let bFolder = join(project.projectDirectory, 'b');
  await mkdir(aFolder);
  await mkdir(bFolder);
  let a = await connectProject(aFolder);
  let b = await connectProject(bFolder);
  await project.cli([
    'status',
    'all',
  ], bFolder);
  let browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  t.after(async () => { await chmod(aFolder, 0o700); await browser.close(); await project.close(); });
  return {
    project,
    a: await transferScope(a.id),
    b: await transferScope(b.id),
    browser,
  };
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} label
 */
async function openTransfer(page, label) {
  await page.waitForSelector('#manager-table tr[data-row-id="desk"] input[type="radio"]');
  await page.click('#manager-table tr[data-row-id="desk"] input[type="radio"]');
  await page.locator(`#session-inspector ::-p-aria([name="${label}"][role="button"])`).click();
  await page.waitForSelector('#manager-transfer dialog[open]');
}

test('manager copies live sessions with explicit options, handles collisions, moves stopped sources and opens the destination separately', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45000,
}, async (t) => {
  let {
    project,
    a,
    b,
    browser,
  } = await fixture(t);
  let files = await writeTransferFixture(a, 'desk', dataHtml + '<agui-field label="Draft" name="draft" value="Initial"></agui-field>');
  let unrelatedPages = [];
  for (let scope of [
    b,
    await transferScope('default'),
  ]) {
    await writeTransferFixture(scope, 'watcher', dataHtml + '<agui-field label="Notes" name="notes" value="Keep"></agui-field>');
    let running = await project.cli([
      'start',
      'watcher',
      '--no-open',
    ], scope.folder || '');
    let watcher = await browser.newPage();
    await watcher.goto(running.url);
    await watcher.waitForSelector('input[name="notes"]');
    await watcher.type('input[name="notes"]', ' this draft');
    unrelatedPages.push({
      scope,
      running,
      page: watcher,
      draft: await watcher.$eval('input[name="notes"]', (element) => element.value),
    });
  }
  let started = await project.cli([
    'start',
    'desk',
    '--no-open',
  ], a.folder);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ], a.folder);
  let live = await browser.newPage();
  await live.goto(started.url);
  await live.waitForSelector('input[name="draft"]');
  await live.type('input[name="draft"]', ' unsaved');
  let draft = await live.$eval('input[name="draft"]', (element) => element.value);
  let page = await browser.newPage();
  page.on('pageerror', (error) => t.diagnostic(String(error)));
  page.setDefaultTimeout(8000);
  await page.goto(manager.launchUrl);
  await openTransfer(page, 'Copy to project');
  assert.equal(await page.$eval('#session-inspector button[title*="stop the session"]', (element) => element.hasAttribute('disabled')), true);
  assert.match(await page.$eval('#manager-transfer details code', (element) => element.textContent || ''), /dataFlow/);
  assert.equal(await page.$eval('agui-toggle[name="transferIncludeData"] input', (element) => element.checked), false);
  await page.select('agui-select[name="transferDestination"] select', b.id);
  await page.click('agui-toggle[name="transferIncludeData"] input');
  await page.click('agui-toggle[name="transferIncludeMetadata"] input');
  await page.evaluate(() => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    let connection = owner.connection;
    if (!connection) { throw new Error('Connection is unavailable.'); }
    let request = connection.request.bind(connection);
    connection.request = async (operation, options) => {
      let result = await request(operation, options);
      if (operation !== 'copy session') { return result; }
      connection.request = request;
      return new Promise((resolve) => Reflect.set(window, 'finishTransfer', () => resolve(result)));
    };
  });
  await page.click('#manager-transfer-form button[type="submit"]');
  await page.waitForFunction(() => typeof Reflect.get(window, 'finishTransfer') === 'function');
  assert.equal(await page.$eval('#manager-transfer-form button[type="submit"]', (element) => element.hasAttribute('disabled')), true);
  assert.match(await page.$eval('#transfer-message', (element) => element.textContent || ''), /Transferring/);
  await page.evaluate(() => Reflect.get(window, 'finishTransfer')());
  await page.waitForFunction(() => document.querySelector('#transfer-message')?.textContent?.includes('Copied to b / desk'));
  let copied = await readTransferFiles(transferPaths(b, 'desk'));
  assert.equal(copied.metadata, files.metadata);
  assert.match(copied.data || '', /committed/);
  assert.equal(await live.$eval('input[name="draft"]', (element) => element.value), draft);
  assert.equal((await project.cli([
    'status',
    'desk',
  ], a.folder)).url, started.url);
  assert.equal((await project.cli([
    'status',
    'desk',
  ], b.folder)).active, false);
  await page.click('#manager-transfer button[aria-label="Close transfer"]');
  await project.cli([
    'stop',
    'desk',
  ], a.folder);
  await page.click('.toolbar button[aria-label="Refresh"]');
  await page.waitForFunction(() => !document.querySelector('#session-inspector button[title*="stop the session"]')?.hasAttribute('disabled'));
  await openTransfer(page, 'Move to project');
  await page.select('agui-select[name="transferDestination"] select', b.id);
  await page.click('#manager-transfer-form button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#transfer-error')?.textContent?.includes('Choose another ID'));
  await page.$eval('agui-field[name="transferSessionId"] input', (element) => {
    element.value = 'moved';
    element.dispatchEvent(new Event('input', {
      bubbles: true,
    }));
  });
  await page.click('#manager-transfer-form button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#transfer-message')?.textContent?.includes('Moved to b / moved'));
  assert.equal((await readTransferFiles(transferPaths(a, 'desk'))).html, null);
  assert.equal((await readTransferFiles(transferPaths(b, 'moved'))).data, null);
  assert.match(await page.$eval('#transfer-message', (element) => element.textContent || ''), /Excluded saved artifacts remain/);
  await page.waitForFunction(() => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    return !owner.busy;
  });
  let navigation = page.waitForNavigation();
  void navigation.catch(() => {});
  await page.click('#transfer-open-destination');
  try { await navigation; }
  catch (error) {
    let state = await page.evaluate(() => {
      let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
      return {
        busy: owner.busy,
        projectError: owner.$.projectError,
        notice: owner.$.notice,
        result: owner.transfers?.result?.state,
        destination: owner.transfers?.result?.destination.id,
      };
    });
    throw new Error(JSON.stringify(state), {
      cause: error,
    });
  }
  await page.waitForSelector('#manager-table tr[data-row-id="moved"]');
  assert.notEqual(page.url(), manager.url);
  assert.equal(new URL(page.url()).hash, '');
  for (let watcher of unrelatedPages) {
    assert.equal(await watcher.page.$eval('input[name="notes"]', (element) => element.value), watcher.draft);
    let status = await project.cli([
      'status',
      'watcher',
    ], watcher.scope.folder || '');
    assert.equal(status.url, watcher.running.url);
    assert.equal(status.feedback.instanceId, watcher.running.feedback.instanceId);
  }
});

test('manager discovers an interrupted move after restart and explicitly restores it without overwriting other files', {
  skip: !executablePath || process.platform === 'win32' || process.getuid?.() === 0 ? 'Requires Chrome and POSIX directory permissions.' : false,
  timeout: 45000,
}, async (t) => {
  let {
    project,
    a,
    b,
    browser,
  } = await fixture(t);
  let original = await writeTransferFixture(a);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ], a.folder);
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(manager.launchUrl);
  await openTransfer(page, 'Move to project');
  await page.select('agui-select[name="transferDestination"] select', b.id);
  await page.click('agui-toggle[name="transferIncludeData"] input');
  await page.click('agui-toggle[name="transferIncludeMetadata"] input');
  await chmod(a.folder || '', 0o500);
  await page.click('#manager-transfer-form button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#transfer-error')?.textContent?.includes('Transfer incomplete'));
  await chmod(a.folder || '', 0o700);
  assert.equal((await readTransferFiles(transferPaths(a, 'desk'))).data, null);
  await project.cli([
    'manager',
    'stop',
  ], a.folder);
  manager = await project.cli([
    'manager',
    '--no-open',
  ], a.folder);
  await page.goto(manager.launchUrl);
  await page.waitForFunction(() => document.querySelector('#transfer-recovery-notice')?.textContent?.includes('transfer needs recovery'));
  await page.click('.toolbar button[aria-label="Transfers"]');
  await page.waitForSelector('#manager-transfers dialog[open]');
  await page.waitForFunction(() => document.querySelector('#manager-transfer-history')?.textContent?.includes('needs-recovery'));
  page.once('dialog', (dialog) => { void dialog.accept(); });
  await page.locator('#manager-transfer-history ::-p-aria([name="Recover incomplete transfer"][role="button"])').click();
  await page.waitForFunction(() => document.querySelector('#manager-transfer-history')?.textContent?.includes('rolled-back'));
  assert.deepEqual(await readTransferFiles(transferPaths(a, 'desk')), original);
  assert.equal((await readTransferFiles(transferPaths(b, 'desk'))).html, null);
  assert.equal(await readFile(transferPaths(a, 'desk').description, 'utf8'), original.description);
});
