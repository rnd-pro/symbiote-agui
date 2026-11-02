import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('declarative lists render authored templates and publish guarded ID selection with independent filtering', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
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
  let visible = () => page.$$eval('#cards [data-item-id]', (items) => items.map((item) => item.getAttribute('data-item-id')));
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
  assert.equal(await page.$eval('#cards agui-panel span', (element) => element.textContent), 'record field');
  assert.deepEqual(await checked('#cards'), [
    'b',
  ]);
  await page.click('#cards [data-item-id="a"] h2');
  assert.deepEqual(await data('ids'), [
    'b',
    'a',
  ]);
  await page.click('#cards [data-item-id="a"] a');
  assert.deepEqual(await data('ids'), [
    'b',
    'a',
  ]);
  await page.focus('#cards [data-item-id="c"]');
  await page.keyboard.press('Space');
  assert.deepEqual(await checked('#cards'), [
    'a',
    'b',
    'c',
  ]);
  await page.click('#cards [data-item-id="b"] input');
  assert.deepEqual(await data('ids'), [
    'a',
    'c',
  ]);
  await update({
    query: 'Beta',
  });
  await page.waitForFunction(() => document.querySelectorAll('#cards [data-item-id]').length === 1);
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
  await page.click('#cards [data-item-id="a"] input');
  assert.deepEqual(await data('ids'), [
    'c',
  ]);
  await update({
    ids: [
      'a',
      'c',
    ],
  });
  await page.click('#single [data-item-id="a"] h3');
  await page.click('#single [data-item-id="b"] input');
  assert.deepEqual(await data('singleIds'), [
    'b',
  ]);
  await page.click('#single [data-item-id="b"] h3');
  assert.deepEqual(await checked('#single'), [
    'b',
  ]);
  await update({
    singleIds: [
      'a',
    ],
  });
  await page.click('#single [data-item-id="b"] input');
  assert.deepEqual(await data('singleIds'), [
    'b',
  ]);
  await page.$eval('#single', (element) => { element.setAttribute('selection', 'none'); });
  await page.waitForFunction(() => document.querySelector('#single input')?.matches(':disabled'));
  assert.equal(await page.$eval('#single', (element) => {
    try { Reflect.get(element, 'edit')([]); return false; } catch { return true; }
  }), true);
  await page.$eval('#single', (element) => { element.setAttribute('loading', ''); });
  await page.waitForFunction(() => document.querySelector('#single [role="list"]')?.hasAttribute('hidden'));
  assert.match(await page.$eval('#single agui-state', (element) => element.textContent || ''), /Loading/);
  await update({
    readonly: true,
  });
  await page.click('#cards [data-item-id="b"] h2');
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
  await page.waitForFunction(() => document.querySelectorAll('#cards [data-item-id]').length === 2);
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
  await page.waitForFunction(() => document.querySelectorAll('#cards [data-item-id]').length === 0);
  assert.deepEqual(await visible(), []);
  assert.match(await page.$eval('#cards agui-state', (element) => element.textContent || ''), /No matches/);
  await page.$eval('#cards', (element) => { element.setAttribute('item-template', '#missing-template'); });
  await page.waitForFunction(() => document.querySelector('#cards [role="list"]')?.hasAttribute('hidden'));
  assert.match(await page.$eval('#cards agui-state', (element) => element.textContent || ''), /Invalid state/);
  assert.deepEqual(errors, []);
});
