import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryManagerProject } from '../node/manager-storage-fixture.js';
import { projectId } from '../../src/projects/identity.js';
import { connectProject } from '../../src/projects/registry.js';
import { openManagerSection } from './helpers.js';

test('All projects renders duplicate IDs, preserves its scope on reload and routes controls and rename to the source folder', {
  timeout: 60_000,
}, async (t) => {
  let project = await temporaryManagerProject();
  let browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 1000,
    },
  });
  t.after(async () => { await browser.close(); await project.close(); });
  let folders = [
    '',
    join(project.directory, 'a'),
    join(project.directory, 'b'),
  ];
  let source = join(project.directory, 'source.html');
  await writeFile(source, '<h1>Shared session ID</h1>');
  for (let folder of folders) {
    if (folder) {
      await mkdir(folder);
      await connectProject(folder);
    }
    await project.cli([
      'save',
      'desk',
      '--file',
      source,
    ], folder);
  }
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  let page = await browser.newPage();
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(manager.launchUrl);
  await page.waitForSelector('#manager-table tr[data-row-id="desk"]');
  await page.select('#manager-project-switcher select', 'all');
  await page.waitForFunction(() => document.querySelectorAll('#manager-table tr[data-row-id]').length === 3);
  assert.equal(new URL(page.url()).searchParams.get('project'), 'all');
  assert.deepEqual(await page.$$eval('#manager-table td[data-column="project"]', (cells) => cells.map((cell) => cell.textContent)), [
    'Default',
    'a',
    'b',
  ]);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#manager-table tr[data-row-id]').length === 3);
  assert.equal(await page.$eval('#manager-project-switcher select', (select) => select.value), 'all');
  await page.locator(`#manager-table tr[data-row-id="${projectId(folders[1])}/desk"]`).click();
  await page.waitForSelector('#manager-inspector button.agui-button-primary:not([disabled])');
  await page.locator('#manager-inspector ::-p-aria([name="Start"][role="button"])').click();
  await page.waitForSelector('#manager-inspector ::-p-aria([name="Stop"][role="button"])' + ':not([disabled])');
  let started = await project.cli([
    'status',
    'desk',
  ], folders[1]);
  assert.equal(started.active, true);
  await page.locator('#manager-inspector ::-p-aria([name="Feedback command"][role="button"])').click();
  await page.waitForFunction((instanceId) => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager | null} */ (document.querySelector('agui-session-manager'));
    return !!owner && owner.feedbackSettings?.settings?.instanceId === instanceId && !owner.busy;
  }, {}, started.instanceId);
  await page.keyboard.press('Escape');
  for (let folder of [
    '',
    folders[2],
  ]) {
    assert.equal((await project.cli([
      'status',
      'desk',
    ], folder)).active, false);
  }
  await page.locator('#manager-inspector ::-p-aria([name="Stop"][role="button"])').click();
  await page.waitForSelector('#manager-inspector ::-p-aria([name="Start"][role="button"])' + ':not([disabled])');
  await page.locator(`#manager-table tr[data-row-id="${projectId(folders[2])}/desk"]`).click();
  await page.locator('#manager-inspector ::-p-aria([name="Rename"][role="button"])').click();
  await page.waitForSelector('#manager-transfer-form', {
    visible: true,
  });
  await page.locator('#manager-transfer-form input[name="transferSessionId"]').fill('renamed');
  await page.locator('#manager-transfer-form button[type="submit"]').click();
  await page.waitForSelector(`#manager-table tr[data-row-id="${projectId(folders[2])}/renamed"]`);
  assert.equal(await readFile(join(folders[2], 'renamed.html'), 'utf8'), '<h1>Shared session ID</h1>');
  assert.equal(await readFile(join(folders[1], 'desk.html'), 'utf8'), '<h1>Shared session ID</h1>');
  await openManagerSection(page, 'projects');
  assert.equal(await page.$eval('#project-views [role="tab"][value="explorer"]', (tab) => tab.hasAttribute('disabled')), true);
  await openManagerSection(page, 'settings');
  assert.equal(new URL(page.url()).search, '?settings&project=all');
  assert.equal(await page.$eval('input[name="saveFolder"]', (input) => input.disabled), true);
  await openManagerSection(page, 'sessions');
  await page.select('#manager-project-switcher select', 'default');
  await page.waitForSelector('#manager-table tr[data-row-id="desk"]');
  assert.equal(await page.$$eval('#manager-table tr[data-row-id]', (rows) => rows.length), 1);
  await page.goBack();
  await page.waitForSelector('#manager-navigation button[value="settings"][aria-current="page"]');
  await page.waitForFunction(() => /** @type {HTMLSelectElement | null} */ (document.querySelector('#manager-project-switcher select'))?.value === 'all');
  await page.goForward();
  await page.waitForSelector('#manager-table tr[data-row-id="desk"]');
  await page.waitForFunction(() => /** @type {HTMLSelectElement | null} */ (document.querySelector('#manager-project-switcher select'))?.value === 'default');
  assert.deepEqual(errors, []);
});
