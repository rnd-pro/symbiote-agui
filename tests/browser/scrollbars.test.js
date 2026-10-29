import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('scrollbar activity ignores content hover and tracks scrollbar interaction independently of scrolling', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 30_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'scrollbar-events').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'scrollbar-events', '--no-open');
  await insertStdin('scrollbar-events', `
    <div id="scroll-region" style="overflow: auto;
      width: 240px;
      height: 180px;
      border: 4px solid transparent;">
      <div style="width: 600px;
        height: 800px;">Scrollable content</div>
    </div>
  `);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  let page = await browser.newPage();
  await page.goto(session.url);
  await page.waitForSelector('#scroll-region');
  let bounds = await page.$eval('#scroll-region', (element) => {
    let rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    };
  });
  let hovering = () => page.$eval('#scroll-region', (element) => element.hasAttribute('data-agui-scrollbar-hover'));
  await page.mouse.move(bounds.left + 50, bounds.top + 50);
  assert.equal(await hovering(), false, 'content hover must not activate its scrollbar');
  await page.mouse.move(bounds.right - 6, bounds.top + 50);
  assert.equal(await hovering(), true, 'vertical track hover activates the scrollbar');
  await page.mouse.move(bounds.left + 50, bounds.bottom - 6);
  assert.equal(await hovering(), true, 'horizontal track hover activates the scrollbar');
  await page.mouse.move(bounds.right - 1, bounds.top + 50);
  assert.equal(await hovering(), false, 'a container border is outside the scrollbar track');
  await page.mouse.move(bounds.left + 50, bounds.top + 50);
  await page.mouse.wheel({
    deltaY: 70,
  });
  await page.waitForFunction(() => document.querySelector('#scroll-region')?.hasAttribute('data-agui-scrolling'));
  assert.equal(await hovering(), false, 'scroll activity must not become hover activity');
  await page.waitForFunction(() => !document.querySelector('#scroll-region')?.hasAttribute('data-agui-scrolling'));
  await page.$eval('#scroll-region', (element) => {
    element.setAttribute('dir', 'rtl');
  });
  await page.mouse.move(bounds.left + 6, bounds.top + 50);
  assert.equal(await hovering(), true, 'RTL scrollbars activate on the left track');
  await page.mouse.move(bounds.left + 50, bounds.top + 50);
  assert.equal(await hovering(), false);
});
