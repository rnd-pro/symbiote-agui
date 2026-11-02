import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('declarative lists render authored templates and publish guarded ID selection with independent filtering', {
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'list').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'list', '--no-open');
  let html = await readFile(new URL('./list.html', import.meta.url), 'utf8');
  await insertStdin('list', html);
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
  await page.waitForSelector('#cards h2');
  /** @param {string} key */
  let data = (key) => page.$eval('#list-data', (element, key) => Reflect.get(element, '$')[key], key);
  /** @param {Record<string, unknown>} values */
  let update = (values) => page.$eval('#list-data', (element, values) => { Reflect.set(element, '$', values); }, values);
  let visible = () => page.$$eval('#cards [data-row]', (items) => items.map((item) => item.getAttribute('data-row')));
  /** @param {string} selector */
  let checked = (selector) => page.$$eval(`${selector} input:checked`, (inputs) => inputs.map((input) => input.getAttribute('value')));
  /**
   * @param {string[]} ids
   * @param {string} [id]
   */
  let call = async (ids, id = 'cards') => {
    let discovery = await cli('tools', 'list');
    let tool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === 'agui-list'
      && item.key === 'set_selection' && JSON.parse(item.componentDescription).id === id);
    assert.ok(tool);
    return (await sendStdin('call', 'list', JSON.stringify({
      pageId: discovery.pageId,
      discoveryId: discovery.discoveryId,
      name: tool.name,
      input: {
        ids,
      },
    }))).result;
  };
  assert.equal(await page.$eval('#cards h2', (element) => element.textContent), '<b>Alpha</b>');
  assert.equal(await page.$('#cards h2 b'), null);
  assert.equal(await page.$('#cards slot, #cards agui-list-item, #cards agui-component, #cards agui-state'), null);
  assert.equal(await page.$('#plain :is(input, button, slot, agui-list-item, agui-component, agui-state)'), null);
  assert.equal(await page.$$eval('#plain section', (elements) => elements.length), 3);
  assert.equal(await page.$$eval('#plain aside', (elements) => elements.length), 3);
  assert.equal(await page.$eval('#cards [data-record-selected]', (element) => element.textContent), 'record field');
  assert.deepEqual(await checked('#cards'), [
    'b',
  ]);
  await page.click('#cards [data-row="a"] h2');
  assert.deepEqual(await data('ids'), [
    'b',
    'a',
  ]);
  await page.click('#cards [data-row="a"] a');
  assert.deepEqual(await data('ids'), [
    'b',
    'a',
  ]);
  await page.focus('#cards [data-row="c"] button');
  await page.keyboard.press('Space');
  assert.deepEqual(await checked('#cards'), [
    'a',
    'b',
    'c',
  ]);
  await page.click('#cards [data-row="b"] input');
  assert.deepEqual(await data('ids'), [
    'a',
    'c',
  ]);
  await update({
    query: 'Beta',
  });
  await page.waitForFunction(() => document.querySelectorAll('#cards [data-row]').length === 1);
  assert.deepEqual(await visible(), [
    'b',
  ]);
  assert.deepEqual(await data('ids'), [
    'a',
    'c',
  ]);
  await call([
    'b',
  ]);
  await update({
    query: '',
  });
  assert.deepEqual(await checked('#cards'), [
    'b',
  ]);
  // Incoming assignments must update controls without being mistaken for new edits.
  await cli('events', 'list');
  await update({
    ids: [
      'a',
      'c',
    ],
  });
  assert.deepEqual(await checked('#cards'), [
    'a',
    'c',
  ]);
  let incoming = await cli('events', 'list');
  assert.equal(incoming.events.filter((/** @type {{type: string}} */ event) => event.type === 'agui:action').length, 0);
  assert.equal((await call([
    'c',
    'a',
  ])).changed, false);
  // Explicit popup selection and delegation must not toggle the same click twice.
  await page.click('#plain [data-row="b"] h4');
  assert.deepEqual(await data('ids'), [
    'a',
    'c',
    'b',
  ]);
  await update({
    ids: [
      'a',
      'c',
    ],
  });
  await page.click('#cards [data-row="a"] input');
  assert.deepEqual(await data('ids'), [
    'c',
  ]);
  await update({
    ids: [
      'a',
      'c',
    ],
  });
  await page.click('#single [data-row="a"] h3');
  await page.click('#single [data-row="b"] input');
  assert.deepEqual(await data('singleIds'), [
    'b',
  ]);
  await update({
    singleIds: [],
  });
  let popupDiscovery = await cli('tools', 'list');
  let popup = popupDiscovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-list'
    && tool.key.startsWith('auto:selectItem@') && JSON.parse(tool.componentDescription).id === 'single');
  assert.ok(popup);
  await sendStdin('call', 'list', JSON.stringify({
    pageId: popupDiscovery.pageId,
    discoveryId: popupDiscovery.discoveryId,
    name: popup.name,
    input: {},
  }));
  let selectedByPopup = await data('singleIds');
  assert.equal(selectedByPopup.length, 1);
  assert.ok((await data('rows')).some((/** @type {{key: string}} */ row) => row.key === selectedByPopup[0]));
  await update({
    singleIds: [
      'b',
    ],
  });
  await page.click('#single [data-row="b"] h3');
  assert.deepEqual(await checked('#single'), [
    'b',
  ]);
  await update({
    singleIds: [
      'a',
    ],
  });
  await page.click('#single [data-row="b"] input');
  assert.deepEqual(await data('singleIds'), [
    'b',
  ]);
  await page.$eval('#single', (element) => { element.setAttribute('selection', 'none'); });
  await page.waitForFunction(() => document.querySelector('#single input')?.matches(':disabled'));
  assert.equal(await page.$eval('#single', (element) => {
    try { Reflect.get(element, 'edit')([]); return false; } catch { return true; }
  }), true);
  await page.$eval('#single', (element) => { element.setAttribute('loading', ''); });
  await page.waitForFunction(() => document.querySelector('#single')?.getAttribute('data-state') === 'loading');
  assert.equal(await page.$eval('#single', (element) => element.getAttribute('aria-busy')), 'true');
  assert.equal(await page.$eval('#single', (element) => element.getAttribute('data-message')), 'Loading');
  assert.equal(await page.$('#single article'), null);
  await page.$eval('#single', (element) => { element.removeAttribute('loading'); });
  await page.waitForSelector('#single article');
  assert.equal(await page.$eval('#single', (element) => element.getAttribute('data-state')), 'ready');
  assert.equal(await page.$eval('#single', (element) => element.getAttribute('aria-busy')), 'false');
  assert.equal(await page.$eval('#single', (element) => element.getAttribute('data-message')), '');
  await page.$eval('#single', (element) => { element.setAttribute('error', 'Request failed'); });
  await page.waitForFunction(() => document.querySelector('#single')?.getAttribute('data-state') === 'error');
  assert.equal(await page.$eval('#single', (element) => element.getAttribute('data-message')), 'Request failed');
  assert.equal(await page.$('#single article'), null);
  await page.$eval('#single', (element) => { element.removeAttribute('error'); });
  await page.waitForSelector('#single article');
  assert.equal(await page.$eval('#single', (element) => element.getAttribute('data-state')), 'ready');
  assert.equal(await page.$eval('#single', (element) => element.getAttribute('data-message')), '');
  await update({
    readonly: true,
  });
  await page.click('#cards [data-row="b"] h2');
  assert.deepEqual(await data('ids'), [
    'a',
    'c',
  ]);
  assert.equal(await page.$eval('#cards input', (element) => element.disabled), true);
  assert.equal(await page.$eval('#cards', (element) => {
    try { Reflect.get(element, 'edit')([]); return false; } catch { return true; }
  }), true);
  await update({
    rows: (await data('rows')).filter((/** @type {{key: string}} */ row) => row.key !== 'a'),
  });
  await page.waitForFunction(() => document.querySelectorAll('#cards [data-row]').length === 2);
  assert.deepEqual(await data('ids'), [
    'a',
    'c',
  ]);
  assert.deepEqual(await checked('#cards'), [
    'c',
  ]);
  await update({
    query: 'missing',
  });
  await page.waitForFunction(() => document.querySelectorAll('#cards [data-row]').length === 0);
  assert.deepEqual(await visible(), []);
  assert.equal(await page.$eval('#cards', (element) => element.getAttribute('data-state')), 'empty');
  assert.equal(await page.$eval('#cards', (element) => element.getAttribute('data-message')), 'No matches');
  await page.$eval('#cards', (element) => { element.setAttribute('item-template', '#missing-template'); });
  await page.waitForFunction(() => document.querySelector('#cards')?.getAttribute('data-state') === 'error');
  assert.equal(await page.$eval('#cards', (element) => element.getAttribute('data-message')), 'Invalid state');
  let beforeDetach = await data('ids');
  await page.$eval('#plain', (element) => {
    Reflect.set(window, 'detachedList', element);
    element.remove();
    element.querySelector('h4')?.click();
  });
  assert.deepEqual(await data('ids'), beforeDetach);
  await page.waitForFunction(() => Reflect.get(window, 'detachedList').allSubs.size === 0);
  assert.deepEqual(errors, []);
});
