import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { projectId } from '../../src/projects/identity.js';
import { temporaryManagerProject } from '../node/manager-storage-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('manager offers a folder picker first, preserves cancellation and falls back to manual connection', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45000,
}, async (t) => {
  let project = await temporaryManagerProject();
  let browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  t.after(async () => { await browser.close(); await project.close(); });
  let folder = join(project.projectDirectory, 'picked project');
  await mkdir(folder);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(manager.launchUrl);
  await page.waitForFunction(() => !document.querySelector('#manager-choose-project')?.hasAttribute('disabled'));
  await page.click('.toolbar button[aria-label="Projects"]');
  await page.waitForSelector('#manager-projects dialog[open]');
  assert.equal(await page.$eval('#manager-connect-project', (form) => form.closest('details')?.open), false);
  await page.evaluate((path) => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    let connection = owner.connection;
    if (!connection) { throw new Error('Missing manager connection.'); }
    let request = connection.request.bind(connection);
    Reflect.set(window, 'pickerOutcome', 'cancel');
    connection.request = (operation, options) => {
      if (operation !== 'choose project') { return request(operation, options); }
      if (Reflect.get(window, 'pickerOutcome') === 'cancel') {
        return Promise.resolve({
          ok: true,
          cancelled: true,
        });
      }
      if (Reflect.get(window, 'pickerOutcome') === 'error') {
        return Promise.resolve({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Fixture picker unavailable. Use Enter folder path instead.',
          },
        });
      }
      return request('connect project', {
        folder: path,
      });
    };
  }, folder);
  await page.click('#manager-choose-project');
  await page.waitForFunction(() => document.querySelector('.notice')?.textContent?.includes('Folder selection canceled'));
  assert.equal(await page.$(`#manager-project-list [data-project="${projectId(folder)}"]`), null);
  assert.equal(await page.$eval('#manager-projects [role="alert"]', (element) => element.textContent), '');
  await page.waitForFunction(() => !document.querySelector('#manager-choose-project')?.hasAttribute('disabled'));
  await page.evaluate(() => Reflect.set(window, 'pickerOutcome', 'selected'));
  await page.click('#manager-choose-project');
  await page.waitForSelector(`#manager-project-list [data-project="${projectId(folder)}"]`);
  assert.equal(page.url(), manager.url, 'Picking connects without switching scope.');
  await page.waitForFunction(() => !document.querySelector('#manager-choose-project')?.hasAttribute('disabled'));
  await page.evaluate(() => Reflect.set(window, 'pickerOutcome', 'error'));
  await page.click('#manager-choose-project');
  await page.waitForFunction(() => document.querySelector('#manager-projects [role="alert"]')?.textContent?.includes('picker unavailable'));
  await page.waitForSelector('#manager-connect-project input', {
    visible: true,
  });
  await page.locator('#manager-connect-project input').fill(folder);
  await page.locator('#manager-connect-project button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('.notice')?.textContent?.includes('Project connected'));
  assert.equal(await page.$$eval(`#manager-project-list [data-project="${projectId(folder)}"]`, (elements) => elements.length), 1);
});
