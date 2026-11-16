import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

test('styled buttons preserve native actions, attribute forwarding, loading guards and tool cleanup', {
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  t.after(async () => {
    await browser.close();
    await cli('stop', 'button').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'button', '--no-open');
  await insertStdin('button', await readFile(new URL('./button.html', import.meta.url), 'utf8'));
  let page = await browser.newPage();
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('button#loading-button');
  /** @param {string} id */
  let call = async (id) => {
    let discovery = await cli('tools', 'button');
    let tool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === 'agui-button'
      && item.key === 'activate' && JSON.parse(item.componentDescription).id === id);
    assert.ok(tool);
    return (await sendStdin('call', 'button', JSON.stringify({
      pageId: discovery.pageId,
      discoveryId: discovery.discoveryId,
      name: tool.name,
      input: {},
    }))).result;
  };
  assert.equal(await page.$eval('#loading-button', (element) => element.className), 'agui-button-primary');
  assert.equal(await page.$eval('#loading-button', (element) => element.getAttribute('data-extra')), 'initial');
  assert.equal(await page.$eval('#loading-button', (element) => element.parentElement?.matches('[id]')), false);
  await page.$eval('#loading-button', (element) => {
    Reflect.set(window, 'buttonHost', element.parentElement);
    Reflect.set(window, 'clicks', 0);
    element.addEventListener('click', () => Reflect.set(window, 'clicks', Reflect.get(window, 'clicks') + 1));
  });
  assert.deepEqual(await call('loading-button'), {
    activated: true,
  });
  assert.equal(await page.evaluate(() => Reflect.get(window, 'clicks')), 1);
  await page.$eval('#button-data', (element) => { Reflect.get(element, '$').loading = true; });
  assert.equal(await page.$eval('#loading-button', (element) => element.getAttribute('aria-busy')), 'true');
  assert.equal(await page.$eval('#loading-button > agui-preloader', (element) => element.hasAttribute('hidden')), false);
  await page.$eval('#loading-button', (element) => /** @type {HTMLButtonElement} */ (element).click());
  assert.equal(await page.evaluate(() => Reflect.get(window, 'clicks')), 1);
  await assert.rejects(() => call('loading-button'));
  await page.$eval('#button-data', (element) => {
    Reflect.set(element, '$', {
      loading: false,
      busy: true,
      title: 'Updated title',
    });
  });
  assert.equal(await page.$eval('#loading-button', (element) => /** @type {HTMLButtonElement} */ (element).disabled), true);
  assert.equal(await page.$eval('#loading-button', (element) => element.getAttribute('title')), 'Updated title');
  for (let id of [
    'loading-button',
    'loading-attribute',
    'read-only',
    'aria-disabled',
    'fieldset-disabled',
  ]) { await assert.rejects(() => call(id)); }
  await page.$eval('#loading-attribute', (element) => element.parentElement?.removeAttribute('loading'));
  await call('loading-attribute');
  await page.$eval('#native-form', (element) => element.addEventListener('submit', (event) => {
    event.preventDefault();
    let form = /** @type {HTMLFormElement} */ (event.target);
    let submitter = /** @type {HTMLButtonElement} */ (/** @type {SubmitEvent} */ (event).submitter);
    Reflect.set(window, 'submitted', Object.fromEntries(new FormData(form, submitter)));
  }));
  await call('submit');
  assert.deepEqual(await page.evaluate(() => Reflect.get(window, 'submitted')), {
    record: 'sample',
    action: 'save',
  });
  await call('native-popover');
  assert.equal(await page.$eval('#button-popover', (element) => element.matches(':popover-open')), true);
  await call('native-popover');
  assert.equal(await page.$eval('#button-popover', (element) => element.matches(':popover-open')), false);
  await page.click('#native-toggle');
  assert.equal(await page.$eval('#button-data', (element) => Reflect.get(element, '$').open), true);
  await page.evaluate(() => Reflect.get(window, 'buttonHost').remove());
  await page.waitForFunction(() => Reflect.get(window, 'buttonHost').allSubs.size === 0);
  assert.deepEqual(errors, []);
});
