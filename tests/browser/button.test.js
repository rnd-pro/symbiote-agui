import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('declarative buttons forward native attributes and activate guarded state, form, and popover actions', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'button').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'button', '--no-open');
  await insertStdin('button', await readFile(new URL('./button.html', import.meta.url), 'utf8'));
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
  await page.waitForSelector('button#toggle-modal');
  /** @param {string} key */
  let data = (key) => page.$eval('#button-data', (element, key) => Reflect.get(element, '$')[key], key);
  /** @param {Record<string, unknown>} values */
  let update = (values) => page.$eval('#button-data', (element, values) => { Reflect.set(element, '$', values); }, values);
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
  assert.equal(await page.$$eval('button#toggle-modal', (elements) => elements.length), 1);
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.tagName), 'BUTTON');
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.getAttribute('class')), 'agui-button-primary');
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.style.getPropertyValue('--forwarded')), 'yes');
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.getAttribute('aria-controls')), 'modal-content');
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.getAttribute('data-extra')), 'initial');
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.tabIndex), 0);
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.getAttribute('type')), 'button');
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.parentElement?.hasAttribute('toggle')), true);
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.parentElement?.matches('[id], [class], [style], [tabindex]')), false);
  await page.$eval('button#toggle-modal', (element) => { Reflect.set(window, 'declarativeButtonHost', element.parentElement); });
  await page.click('#toggle-modal agui-icon');
  assert.equal(await data('showModal'), true);
  await page.click('#close-modal');
  assert.equal(await data('showModal'), false);
  assert.deepEqual(await call('open-modal'), {
    activated: true,
    changed: true,
  });
  assert.deepEqual(await call('open-modal'), {
    activated: true,
    changed: false,
  });
  await page.focus('button#toggle-modal');
  await page.keyboard.press('Space');
  assert.equal(await data('showModal'), false);
  await page.focus('button#toggle-modal');
  await page.keyboard.press('Enter');
  assert.equal(await data('showModal'), true);
  await page.click('#settings');
  assert.equal(await data('currentSection'), 'settings');
  await call('numeric-string');
  assert.equal(await data('currentSection'), '1');
  await page.click('#parent-toggle');
  assert.equal(await data('other'), true);
  await page.click('#shared-toggle');
  assert.equal(await data('other'), false);
  await cli('events', 'button');
  await update({
    showModal: false,
    busy: true,
    title: 'Updated title',
    buttonText: 'Changed text',
  });
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.disabled), true);
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.title), 'Updated title');
  assert.equal(await page.$eval('#toggle-modal > span', (element) => element.textContent), 'Changed text');
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.getAttribute('aria-expanded')), 'false');
  await page.click('button#toggle-modal');
  await page.click('#read-only');
  await page.click('#aria-disabled');
  await page.click('#fieldset-disabled');
  assert.equal(await data('showModal'), false);
  let incoming = await cli('events', 'button');
  assert.equal(incoming.events.some((/** @type {{type: string}} */ event) => event.type === 'agui:action'), false);
  assert.equal(await page.evaluate(() => {
    try { Reflect.get(window, 'declarativeButtonHost').activate(); return false; } catch { return true; }
  }), true);
  await update({
    busy: false,
  });
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.disabled), false);
  await page.evaluate(() => {
    let host = Reflect.get(window, 'declarativeButtonHost');
    host.setAttribute('data-extra', 'updated');
    host.removeAttribute('title');
    host.toggleAttribute('disabled');
  });
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.getAttribute('data-extra')), 'updated');
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.hasAttribute('title')), false);
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.disabled), true);
  await page.evaluate(() => Reflect.get(window, 'declarativeButtonHost').toggleAttribute('disabled', false));
  assert.equal(await page.$eval('button#toggle-modal', (element) => element.disabled), false);
  for (let id of [
    'invalid-toggle',
    'unknown-target',
    'ambiguous',
  ]) { await assert.rejects(() => call(id)); }
  assert.equal(await data('showModal'), false);
  assert.equal(await data('currentSection'), '1');
  await page.evaluate(() => {
    document.querySelector('#native-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      let form = /** @type {HTMLFormElement} */ (event.target);
      let submitter = /** @type {HTMLButtonElement} */ (/** @type {SubmitEvent} */ (event).submitter);
      Reflect.set(window, 'buttonFormResult', Object.fromEntries(new FormData(form, submitter)));
    });
  });
  await call('submit');
  assert.deepEqual(await page.evaluate(() => Reflect.get(window, 'buttonFormResult')), {
    record: 'sample',
    action: 'save',
  });
  await call('native-popover');
  assert.equal(await page.$eval('#button-popover', (element) => element.matches(':popover-open')), true);
  await page.click('#native-popover');
  assert.equal(await page.$eval('#button-popover', (element) => element.matches(':popover-open')), false);
  let tools = await cli('tools', 'button');
  let owners = new Set(tools.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-button'
    && JSON.parse(tool.componentDescription).id === 'toggle-modal').map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerId));
  await page.evaluate(() => Reflect.get(window, 'declarativeButtonHost').remove());
  await page.waitForFunction(() => Reflect.get(window, 'declarativeButtonHost').allSubs.size === 0);
  let after = await cli('tools', 'button');
  assert.equal(after.tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => owners.has(tool.ownerId)), false);
  await page.evaluate(() => Reflect.get(window, 'declarativeButtonHost').control.click());
  assert.equal(await data('showModal'), false);
  assert.deepEqual(errors, []);
});
