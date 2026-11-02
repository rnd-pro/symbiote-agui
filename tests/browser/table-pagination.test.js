import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('table pagination removes outgoing rows immediately, including rapid navigation and a shorter final page', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'pagination').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'pagination', '--no-open');
  await insertStdin('pagination', await readFile(new URL('./table.html', import.meta.url), 'utf8'));
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  await page.emulateMediaFeatures([
    {
      name: 'prefers-reduced-motion',
      value: 'no-preference',
    },
  ]);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('#records-table tbody td');
  await page.$eval('#table-data', (element) => {
    let state = Reflect.get(element, '$');
    state.rows = state.rows.slice(0, 5);
  });
  let pages = await page.$eval('#records-table', async (element) => {
    let read = () => [...element.querySelectorAll('tbody tr')].map((row) => row.getAttribute('data-row-id'));
    let snapshots = [
      read(),
    ];
    // Stay within the exit-animation window to catch accumulated stale rows.
    for (let direction of [
      'last',
      'last',
      'first',
      'first',
    ]) {
      let button = /** @type {HTMLButtonElement} */ (element.querySelector(`.agui-table-pagination button:${direction}-child`));
      button.click();
      await Promise.resolve();
      snapshots.push(read());
    }
    return snapshots;
  });
  assert.deepEqual(pages, [
    [
      'a',
      'b',
    ],
    [
      'c',
      'd',
    ],
    [
      'e',
    ],
    [
      'c',
      'd',
    ],
    [
      'a',
      'b',
    ],
  ]);
  assert.deepEqual(errors, []);
});
