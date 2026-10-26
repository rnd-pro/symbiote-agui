import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { temporaryManagerProject } from '../node/manager-storage-fixture.js';
import { clickDataAction } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('manager feedback dialog configures delivery, preserves drafts, and disables the handler', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45_000,
}, async (t) => {
  let project = await temporaryManagerProject();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await project.close();
  });
  let session = await project.cli([
    'start',
    'desk',
    '--no-open',
  ]);
  await project.cli([
    'insert',
    'desk',
    '--file',
    fileURLToPath(new URL('./data-toolbar.html', import.meta.url)),
  ]);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  let draft = await browser.newPage();
  await draft.goto(session.url);
  await draft.waitForSelector('#name input');
  await draft.type('#name input', 'Keep my draft');
  let page = await browser.newPage();
  page.setDefaultTimeout(8_000);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(manager.launchUrl);
  await page.waitForSelector('#manager-table tr[data-row-id="desk"]');
  await page.click('#manager-table tr[data-row-id="desk"] td');
  await page.locator('#session-inspector ::-p-aria([name="Feedback command"][role="button"])').click();
  await page.waitForSelector('#manager-feedback dialog[open]');
  await page.waitForFunction(() => !document.querySelector('#feedback-save')?.hasAttribute('disabled'));
  await page.locator('input[name="feedbackConversation"]').fill('browser-fixture-chat');
  await page.locator('textarea[name="feedbackCommand"]').fill('invalid json');
  await page.click('#feedback-save');
  await page.waitForFunction(() => document.querySelector('#feedback-error')?.textContent?.includes('valid JSON'));
  let log = join(project.directory, 'feedback-delivery.jsonl');
  let command = {
    executable: process.execPath,
    args: [
      fileURLToPath(new URL('../node/feedback-fixture.js', import.meta.url)),
      'record',
      log,
    ],
    input: {
      channel: 'stdin',
    },
  };
  await page.locator('textarea[name="feedbackCommand"]').fill(JSON.stringify(command, null, 2));
  await page.click('#feedback-save');
  await page.waitForFunction(() => document.querySelector('#feedback-message')?.textContent?.includes('configured'));
  assert.equal(await page.$eval('input[name="feedbackConversation"]', (element) => element.readOnly), true);
  await assert.rejects(readFile(log), {
    code: 'ENOENT',
  });
  assert.equal(await draft.$eval('#name input', (element) => element.value), 'Keep my draft');
  await draft.bringToFront();
  await clickDataAction(draft, '#data', 'Save');
  await draft.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.delivery?.state === 'accepted');
  assert.equal(JSON.parse(await readFile(log, 'utf8')).conversationId, 'browser-fixture-chat');
  await page.bringToFront();
  await page.click('#feedback-disable');
  await page.waitForFunction(() => document.querySelector('#feedback-message')?.textContent?.includes('disabled'));
  await draft.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.['AGUI_FEEDBACK/availability'] === 'disabled');
  assert.equal(await page.$eval('#feedback-disable', (element) => Reflect.get(element, 'disabled')), true);
  assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1);
  assert.deepEqual(errors, []);
});
