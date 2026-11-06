import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryManagerProject } from '../node/manager-storage-fixture.js';
import { openManagerSection, selectManagerProject } from './helpers.js';

test('manager sections retain session selection, local tabs and settings drafts while scoping controllers and inspector', {
  timeout: 45_000,
}, async (t) => {
  let project = await temporaryManagerProject();
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 1000,
    },
  });
  t.after(async () => {
    await browser.close();
    await project.close();
  });
  let source = join(project.directory, 'source.html');
  await writeFile(source, '<p>Navigation fixture</p>');
  await project.cli([
    'save',
    'desk',
    '--file',
    source,
  ], '');
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  let page = await browser.newPage();
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(manager.launchUrl);
  await page.waitForSelector('#manager-table tr[data-row-id="desk"]');
  assert.ok(await page.$('agui-header #manager-project-switcher select'));
  assert.equal(await page.$('agui-app > agui-sidebar #manager-filter'), null);
  assert.deepEqual(await page.$$eval('#session-views [role="tab"]', (tabs) => tabs.map((tab) => tab.getAttribute('value'))), [
    'table',
    'cards',
  ]);
  await page.locator('#manager-filter input[type="search"]').fill('desk');
  await page.locator('#manager-table tr[data-row-id="desk"] td[data-column=""] input').click();
  await page.waitForSelector('#manager-inspector', {
    visible: true,
  });
  await openManagerSection(page, 'projects');
  await page.waitForSelector('#manager-inspector', {
    hidden: true,
  });
  assert.deepEqual(await page.$$eval('#project-views [role="tab"]', (tabs) => tabs.map((tab) => tab.getAttribute('value'))), [
    'connected',
    'explorer',
    'transfers',
  ]);
  await selectManagerProject(page, 'default');
  assert.equal(await page.$('#manager-inspector [data-session="desk"]'), null);
  assert.equal(await page.$eval('#manager-inspector button.agui-button-danger', (button) => button.hasAttribute('disabled')), true);
  await page.locator('#project-views [role="tab"][value="explorer"]').click();
  await page.waitForSelector('#manager-inspector', {
    hidden: true,
  });
  await page.waitForSelector('#explorer-entries [data-entry="desk.html"]');
  await openManagerSection(page, 'connections');
  assert.deepEqual(await page.$eval('agui-session-manager', (element) => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (element);
    return {
      explorer: owner.explorer?.active,
      connections: owner.liveConnections?.active,
    };
  }), {
    explorer: false,
    connections: true,
  });
  await openManagerSection(page, 'settings');
  await page.locator('input[name="saveFolder"]').fill('./draft-library');
  assert.equal(await page.$('#manager-settings dialog'), null);
  await openManagerSection(page, 'sessions');
  assert.equal(await page.$eval('#manager-filter input[type="search"]', (element) => element.value), 'desk');
  assert.equal(await page.$eval('#manager-table tr[data-row-id="desk"] td[data-column=""] input', (element) => element.checked), true);
  await page.waitForSelector('#manager-inspector', {
    visible: true,
  });
  await openManagerSection(page, 'projects');
  assert.equal(await page.$eval('#project-views [role="tab"][value="explorer"]', (tab) => tab.getAttribute('aria-selected')), 'true');
  await openManagerSection(page, 'settings');
  assert.equal(await page.$eval('input[name="saveFolder"]', (element) => element.value), './draft-library');
  assert.deepEqual(await page.$$eval('#manager-navigation [aria-current]', (buttons) => buttons.map((button) => button.getAttribute('value'))), [
    'settings',
  ]);
  assert.deepEqual(errors, []);
});
