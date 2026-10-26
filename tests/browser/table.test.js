import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;
let table = '#records-table';
let filter = '#records-filter';

test('independent filters compose with provider-backed tables, sorting and selection by ID, and mirror native table structure without session scripts', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'table').catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'table', '--no-open');
  let html = await readFile(new URL('./table.html', import.meta.url), 'utf8');
  await insertStdin('table', html);
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
  await page.waitForSelector(`${table} tbody td`);
  /** @param {string} [id] */
  let visible = (id = table) => page.$$eval(`${id} tbody tr`, (rows) => rows.map((row) => row.getAttribute('data-row-id')));
  /** @param {string} key */
  let data = (key) => page.$eval('#table-data', (element, key) => Reflect.get(element, '$')[key], key);
  /**
   * @param {string} selector
   * @param {string} value
   */
  let input = (selector, value) => page.$eval(selector, (element, value) => {
    Reflect.set(element, 'value', value);
    element.dispatchEvent(new Event('input', {
      bubbles: true,
    }));
  }, value);
  /** @param {Record<string, unknown>} values */
  let update = (values) => sendStdin('update', 'table', JSON.stringify({
    selector: '#table-data',
    values,
  }));
  /**
   * @param {string} key
   * @param {Record<string, unknown>} [input]
   * @param {string} [id]
   */
  let call = async (key, input = {}, id = 'records-table') => {
    let discovery = await cli('tools', 'table');
    let tool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === (id.includes('filter') ? 'agui-filter' : 'agui-table')
      && item.key === key && JSON.parse(item.componentDescription).id === id);
    assert.ok(tool);
    return (await sendStdin('call', 'table', JSON.stringify({
      pageId: discovery.pageId,
      discoveryId: discovery.discoveryId,
      name: tool.name,
      input,
    }))).result;
  };
  assert.deepEqual(await visible(), [
    'a',
    'b',
  ]);
  assert.equal(await page.$eval(`${table} td[data-column="name"]`, (element) => element.textContent?.trim()), '<b>Alpha</b>');
  assert.equal(await page.$(`${table} td b`), null);
  let originalRows = await data('rows');
  assert.deepEqual(await data('matchingIds'), originalRows.map((/** @type {{key: string}} */ row) => row.key));
  await cli('events', 'table');
  await call('set_query', {
    query: 'Gamma',
  }, 'independent-filter');
  assert.deepEqual(await data('otherIds'), [
    'c',
  ]);
  assert.deepEqual(await visible(), [
    'a',
    'b',
  ]);
  let catalog = await cli('tools', 'table');
  assert.equal(catalog.tools.some((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === 'agui-table' && item.key === 'set_query'), false);
  let fieldTool = catalog.tools.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === 'agui-filter-field' && item.key === 'set_filter'
    && JSON.parse(item.componentDescription).filterId === 'independent-filter' && JSON.parse(item.componentDescription).field === 'name');
  assert.ok(fieldTool);
  await sendStdin('call', 'table', JSON.stringify({
    pageId: catalog.pageId,
    discoveryId: catalog.discoveryId,
    name: fieldTool.name,
    input: {
      value: 'Beta',
    },
  }));
  assert.deepEqual((await call('read_result', {}, 'independent-filter')).items, []);
  await cli('events', 'table');

  await page.click(`${table} tr[data-row-id="a"] td[data-column="name"]`);
  assert.deepEqual(await data('ids'), [
    'd',
    'a',
  ]);
  assert.equal(await page.$eval(`${table} tr[data-row-id="a"]`, (element) => element.getAttribute('aria-selected')), 'true');
  await page.click(`${table} tr[data-row-id="b"] td[data-column="name"]`);
  await page.click(`${table} tr[data-row-id="a"] td[data-column="name"]`);
  assert.deepEqual(await data('ids'), [
    'd',
    'b',
  ]);
  await page.focus(`${table} tr[data-row-id="b"]`);
  await page.keyboard.press('Enter');
  assert.deepEqual(await data('ids'), [
    'd',
  ]);
  await page.keyboard.press('Space');
  assert.deepEqual(await data('ids'), [
    'd',
    'b',
  ]);
  await page.keyboard.press('Space');
  await page.$eval(`${table} tr[data-row-id="a"] td[data-column="name"]`, (cell) => {
    let button = document.createElement('button');
    button.type = 'button';
    button.id = 'row-action-fixture';
    button.textContent = 'Row action';
    cell.append(button);
  });
  await page.click('#row-action-fixture');
  assert.deepEqual(await data('ids'), [
    'd',
  ], 'An embedded control does not select its row.');
  await page.$eval('#row-action-fixture', (element) => element.remove());
  await page.$eval(table, (element) => element.setAttribute('selection', 'none'));
  await page.click(`${table} tr[data-row-id="a"] td[data-column="name"]`);
  assert.deepEqual(await data('ids'), [
    'd',
  ]);
  assert.equal(await page.$eval(`${table} tr[data-row-id="a"]`, (element) => element.hasAttribute('aria-selected')), false);
  await page.$eval(table, (element) => element.setAttribute('selection', 'multiple'));
  await page.click(`${table} tr[data-row-id="a"] td[data-column=""] input`);
  assert.deepEqual(await data('ids'), [
    'd',
    'a',
  ]);
  await call('set_value', {
    value: {
      score: {
        min: 0,
      },
    },
  }, 'records-filter');
  await page.click(`${table} th[data-column=""] input`);
  assert.deepEqual(await data('ids'), [
    'd',
    'a',
    'b',
    'c',
  ]);
  await page.click(`${table} th[data-column=""] input`);
  assert.deepEqual(await data('ids'), [
    'd',
  ]);
  assert.equal(await page.$eval(`${table} .agui-table-pagination`, (element) => Reflect.get(element, 'hidden')), false);
  await page.click(`${table} .agui-table-pagination button:last-child`);
  assert.equal((await call('set_page', {
    page: 2,
  })).changed, false);
  assert.deepEqual(await visible(), [
    'c',
  ]);
  await page.click(`${table} tr[data-row-id="c"] td[data-column=""] input`);
  await page.type('#external-query input', 'Beta');
  assert.equal(await page.$eval(`${table} .agui-table-pagination`, (element) => Reflect.get(element, 'hidden')), true);
  assert.equal(await page.$eval(`${filter} .agui-filter-query input`, (input) => Reflect.get(input, 'value')), 'Beta');
  assert.deepEqual(await visible(), [
    'b',
  ]);
  assert.deepEqual(await data('ids'), [
    'd',
    'c',
  ]);
  await call('set_query', {
    query: '',
  }, 'records-filter');
  await call('set_value', {
    value: {},
  }, 'records-filter');
  await call('set_sort', {
    sort: {
      key: 'score',
      direction: 'ascending',
    },
  });
  assert.deepEqual(await visible(), [
    'e',
    'a',
  ]);
  await page.click(`${table} th[data-column="score"] button`);
  assert.equal(await page.$eval(`${table} th[data-column="score"]`, (element) => element.getAttribute('aria-sort')), 'descending');
  assert.deepEqual(await visible(), [
    'b',
    'c',
  ]);
  assert.deepEqual(await data('sort'), {
    key: 'score',
    direction: 'descending',
  });
  await call('set_selection', {
    ids: [
      'b',
      'c',
    ],
  });
  await cli('events', 'table');
  assert.equal((await call('set_selection', {
    ids: [
      'c',
      'b',
    ],
  })).changed, false);
  assert.equal((await cli('events', 'table')).events.length, 0);
  assert.equal((await call('read_view')).items.length, 2);
  let selectionTools = await cli('tools', 'table');
  let selectB = selectionTools.tools.find((/** @type {import('../../types/tools.js').PageTool} */ tool) => {
    if (tool.ownerName !== 'agui-table-cell' || tool.key !== 'set_selected') { return false; }
    let context = JSON.parse(tool.componentDescription);
    return context.tableId === 'records-table' && context.recordId === 'b';
  });
  assert.ok(selectB);
  let selected = await sendStdin('call', 'table', JSON.stringify({
    pageId: selectionTools.pageId,
    discoveryId: selectionTools.discoveryId,
    name: selectB.name,
    input: {
      selected: false,
    },
  }));
  assert.equal(selected.result.selectedCount, 1);
  await call('set_selection', {
    ids: [
      'b',
      'c',
    ],
  });
  await call('set_sort', {
    sort: null,
  });
  assert.equal(await page.$eval(`${table} th[data-column="score"]`, (element) => element.hasAttribute('aria-sort')), false);
  await page.select(`${filter} fieldset[data-field="status"] select`, 'new');
  assert.deepEqual(await visible(), [
    'a',
    'c',
  ]);
  await page.select(`${filter} fieldset[data-field="status"] select`, '');
  await input(`${filter} fieldset[data-field="score"] label:first-child input`, '0');
  await input(`${filter} fieldset[data-field="score"] label:last-child input`, '0');
  assert.deepEqual(await visible(), [
    'a',
  ]);
  await input(`${filter} fieldset[data-field="score"] label:last-child input`, '');
  await input(`${filter} fieldset[data-field="score"] label:first-child input`, '');
  await page.type(`${filter} fieldset[data-field="name"] input[type="search"]`, 'Gamma');
  assert.deepEqual(await visible(), [
    'c',
  ]);
  await call('set_value', {
    value: {},
  }, 'records-filter');
  await page.select(`${filter} fieldset[data-field="active"] select`, 'false');
  assert.deepEqual(await visible(), [
    'a',
    'c',
  ]);
  await page.select(`${filter} fieldset[data-field="active"] select`, '');
  await page.click('#single-table tr[data-row-id="a"] td[data-column=""] input');
  await page.click('#single-table tr[data-row-id="b"] td[data-column="name"]');
  await page.click('#single-table tr[data-row-id="b"] td[data-column="name"]');
  assert.deepEqual(await data('singleIds'), [
    'b',
  ]);
  await page.focus('#single-table tr[data-row-id="a"]');
  await page.keyboard.press('Space');
  assert.deepEqual(await data('singleIds'), [
    'a',
  ]);
  await page.focus('#single-table tr[data-row-id="b"]');
  await page.keyboard.press('Enter');
  assert.deepEqual(await data('singleIds'), [
    'b',
  ]);
  await update({
    rows: await data('rows'),
  });
  assert.equal(await page.$eval('#single-table tr[data-row-id="b"] td[data-column=""] input', (element) => Reflect.get(element, 'checked')), true, 'Data refresh keeps the visible radio selected; hidden data-cell inputs cannot take its group selection.');
  await update({
    readonly: true,
  });
  assert.equal(await page.$eval(`${filter} .agui-filter-query input`, (element) => Reflect.get(element, 'disabled')), true);
  assert.equal(await page.$eval(table, (element) => {
    try { Reflect.get(element, 'selectRow')('a', true); return false; }
    catch { return true; }
  }), true);
  let readOnlyIds = await data('ids');
  await page.click(`${table} tr[data-row-id="a"] td[data-column="name"]`);
  assert.deepEqual(await data('ids'), readOnlyIds, 'Read-only rows cannot publish selection changes.');

  await cli('events', 'table');
  await update({
    readonly: false,
    rows: originalRows.filter((/** @type {{key: string}} */ row) => row.key !== 'c'),
    query: 'Alpha',
  });
  assert.deepEqual(await data('ids'), [
    'b',
    'c',
  ]);
  assert.deepEqual((await call('read_selection')).items, [
    'b',
  ]);
  assert.equal((await cli('events', 'table')).events.length, 0);
  await update({
    rows: [
      originalRows[0],
      originalRows[0],
    ],
  });
  assert.equal(await page.$eval(`${table} > p`, (element) => element.textContent), 'Invalid record identities');
  await update({
    rows: originalRows,
    query: '',
    sort: null,
    loading: true,
  });
  assert.equal(await page.$eval(`${table} > p`, (element) => element.textContent), 'Loading records');
  await update({
    loading: false,
  });
  await cli('share', 'table');
  let viewer = await browser.newPage();
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelectorAll('#records-table table > tbody > tr').length === 2;
  });
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert && !frame.contentWindow?.customElements.get('agui-table')
      && !frame.contentDocument.querySelector('agui-table-row, agui-table-cell, agui-table-heading');
  }), true);
  await page.bringToFront();
  await page.type(`${filter} .agui-filter-query input`, 'Beta');
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#records-table tbody tr')?.getAttribute('data-row-id') === 'b';
  }, {
    polling: 50,
  });
  let discovery = await cli('tools', 'table');
  let owners = discovery.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName.startsWith('agui-table') || tool.ownerName.startsWith('agui-filter'))
    .map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerId);
  await page.$eval(table, (element) => { Reflect.set(window, 'oldTable', element); });
  await page.$eval(filter, (element) => { Reflect.set(window, 'oldFilter', element); });
  await insertStdin('table', '<p>Replaced</p>');
  await page.waitForFunction(() => Reflect.get(window, 'oldTable').allSubs.size === 0 && Reflect.get(window, 'oldFilter').allSubs.size === 0);
  assert.equal((await cli('tools', 'table')).tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => owners.includes(tool.ownerId)), false);
  assert.deepEqual(errors, []);
});
