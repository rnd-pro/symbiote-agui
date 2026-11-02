import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('conditional content follows native contexts, preserves hidden drafts, and mounts fresh DOM with scoped tool cleanup', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'conditional').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'conditional', '--no-open');
  let html = await readFile(new URL('./conditional.html', import.meta.url), 'utf8');
  await insertStdin('conditional', html);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('#preserved input', {
    visible: false,
  });
  /** @param {string} id */
  let hidden = (id) => page.$eval(`#${id}`, (element) => element.hasAttribute('hidden'));
  /** @param {Record<string, unknown>} values */
  let update = (values) => page.$eval('#conditional-data', (element, values) => { Reflect.set(element, '$', values); }, values);
  assert.equal(await hidden('default'), true);
  assert.equal(await hidden('inverse'), false);
  assert.equal(await hidden('tab'), true);
  assert.equal(await hidden('truthy'), true);
  assert.equal(await hidden('string'), true);
  assert.equal(await hidden('number'), true);
  assert.equal(await page.$('#reset'), null);
  assert.equal(await page.$('#direct span'), null);
  assert.equal(await hidden('hidden-mode'), false);
  assert.equal(await hidden('removed-mode'), false);
  await page.focus('#hidden-draft input');
  await page.keyboard.press('End');
  await page.type('#hidden-draft input', ' draft');
  await page.focus('#inverse-reset input');
  await page.keyboard.press('End');
  await page.type('#inverse-reset input', ' draft');
  await page.$eval('#hidden-draft', (element) => { Reflect.set(window, 'hiddenConditionalField', element); });
  await page.$eval('#inverse-reset', (element) => { Reflect.set(window, 'inverseRemovedConditionalField', element); });
  let baseline = await cli('tools', 'conditional');
  let baselineOwners = new Set(baseline.tools.map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerId));
  await update({
    enabled: true,
    tab: 'settings',
  });
  await page.waitForSelector('#reset input');
  assert.equal(await hidden('default'), false);
  assert.equal(await hidden('inverse'), true);
  assert.equal(await hidden('tab'), false);
  assert.equal(await hidden('truthy'), false);
  assert.equal(await hidden('parent'), false);
  assert.equal(await hidden('nested'), false);
  assert.equal(await hidden('hidden-mode'), true);
  assert.equal(await hidden('removed-mode'), true);
  assert.equal(await page.$('#inverse-reset'), null);
  assert.equal(await page.$eval('#direct span', (element) => element.textContent), 'Direct content Initial');
  await page.focus('#preserved input');
  await page.keyboard.press('End');
  await page.type('#preserved input', ' draft');
  await page.focus('#reset input');
  await page.keyboard.press('End');
  await page.type('#reset input', ' draft');
  await page.$eval('#preserved', (element) => { Reflect.set(window, 'preservedConditionalField', element); });
  await page.$eval('#reset', (element) => { Reflect.set(window, 'removedConditionalField', element); });
  let discovery = await cli('tools', 'conditional');
  let resetTools = discovery.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-field'
    && !baselineOwners.has(tool.ownerId));
  assert.ok(resetTools.length > 0);
  await update({
    enabled: false,
    name: 'Updated',
  });
  assert.equal(await hidden('default'), true);
  assert.equal(await page.$('#reset'), null);
  assert.equal(await page.$('#nested'), null);
  assert.equal(await page.$eval('#default span', (element) => element.textContent), 'Updated');
  assert.equal(await hidden('hidden-mode'), false);
  assert.equal(await hidden('removed-mode'), false);
  await page.waitForSelector('#inverse-reset input');
  assert.equal(await page.$eval('#hidden-draft input', (element) => element.value), 'Original draft');
  assert.equal(await page.$eval('#inverse-reset input', (element) => element.value), 'Original');
  assert.equal(await page.$eval('#hidden-draft', (element) => Reflect.get(window, 'hiddenConditionalField') === element), true);
  assert.equal(await page.$eval('#inverse-reset', (element) => Reflect.get(window, 'inverseRemovedConditionalField') === element), false);
  let after = await cli('tools', 'conditional');
  assert.equal(after.tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => resetTools.some((/** @type {import('../../types/tools.js').PageTool} */ previous) => previous.name === tool.name)), false);
  await update({
    enabled: true,
  });
  await page.waitForSelector('#reset input');
  assert.equal(await page.$eval('#preserved input', (element) => element.value), 'Original draft');
  assert.equal(await page.$eval('#reset input', (element) => element.value), 'Original');
  assert.equal(await page.$eval('#preserved', (element) => Reflect.get(window, 'preservedConditionalField') === element), true);
  assert.equal(await page.$eval('#reset', (element) => Reflect.get(window, 'removedConditionalField') === element), false);
  await page.$eval('#retarget', (element) => { element.setAttribute('when', 'CONDITIONS/other'); });
  await update({
    enabled: false,
  });
  assert.equal(await hidden('retarget'), false);
  await update({
    other: false,
  });
  assert.equal(await hidden('retarget'), true);
  await page.$eval('#retarget', (element) => { element.setAttribute('is', 'false'); });
  assert.equal(await hidden('retarget'), false);
  await page.$eval('#retarget', (element) => { element.setAttribute('when', 'CONDITIONS/enabled'); });
  assert.equal(await hidden('retarget'), false);
  // behavior names the matching state; a nonmatch applies its opposite.
  for (let scenario of [
    {
      behavior: 'show',
      matchedHidden: false,
      unmatchedHidden: true,
      matchedMounted: true,
      unmatchedMounted: true,
    },
    {
      behavior: 'hide',
      matchedHidden: true,
      unmatchedHidden: false,
      matchedMounted: true,
      unmatchedMounted: true,
    },
    {
      behavior: 'dom-add',
      matchedHidden: false,
      unmatchedHidden: true,
      matchedMounted: true,
      unmatchedMounted: false,
    },
    {
      behavior: 'dom-remove',
      matchedHidden: true,
      unmatchedHidden: false,
      matchedMounted: false,
      unmatchedMounted: true,
    },
  ]) {
    for (let matches of [
      true,
      false,
    ]) {
      await page.$eval('#retarget', (element, behavior, matches) => {
        element.setAttribute('behavior', behavior);
        element.setAttribute('is', matches ? 'false' : 'true');
      }, scenario.behavior, matches);
      assert.equal(await hidden('retarget'), matches ? scenario.matchedHidden : scenario.unmatchedHidden, scenario.behavior);
      assert.equal(await page.$eval('#retarget .agui-conditional-content', (element) => !!element.firstElementChild),
        matches ? scenario.matchedMounted : scenario.unmatchedMounted, scenario.behavior);
    }
  }
  await page.$eval('#default', (element) => { element.setAttribute('behavior', 'dom-add'); });
  assert.equal(await page.$('#preserved'), null);
  await page.$eval('#default', (element) => { element.removeAttribute('behavior'); });
  await page.waitForSelector('#preserved input', {
    visible: false,
  });
  assert.equal(await page.$eval('#preserved input', (element) => element.value), 'Original');
  await page.evaluate(() => {
    let provider = document.createElement('context-provider');
    provider.setAttribute('ctx', 'LATE');
    provider.innerHTML = '<script type="application/json">{"enabled":true}</script>';
    document.querySelector('#conditional-data')?.append(provider);
  });
  await page.waitForFunction(() => !document.querySelector('#late')?.hasAttribute('hidden'));
  await page.$eval('#retarget', (element) => {
    Reflect.set(window, 'removedConditional', element);
    element.remove();
  });
  await page.waitForFunction(() => Reflect.get(window, 'removedConditional').allSubs.size === 0);
  await update({
    enabled: true,
    other: true,
  });
  assert.deepEqual(errors, []);
});
