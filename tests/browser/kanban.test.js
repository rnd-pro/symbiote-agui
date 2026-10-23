import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { readRuntimeCache } from '../../src/data/cache.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;
let board = '#work-board';
let cardA = `${board} li[data-record-id="a"]`;

test('kanban drag and keyboard moves share table records, preserve drafts until Save, support tools, and mirror inert cards', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'kanban').catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'kanban', '--no-open');
  await insertStdin('kanban', await readFile(new URL('./kanban.html', import.meta.url), 'utf8'));
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  await page.setViewport({
    width: 1400,
    height: 1200,
  });
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector(cardA);
  await page.setDragInterception(true);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#work-toolbar') || {}, '$')?.connectionLabel === 'Connected');
  /** @param {string} [id] */
  let rows = (id = '#work-data') => page.$eval(id, (element) => Reflect.get(element, '$').records);
  /** @param {Record<string, unknown>} values */
  let update = (values) => sendStdin('update', 'kanban', JSON.stringify({
    selector: '#work-data',
    values,
  }));
  /**
   * @param {string} key
   * @param {Record<string, unknown>} [input]
   */
  let call = async (key, input = {}) => {
    let discovery = await cli('tools', 'kanban');
    let tool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === 'agui-kanban'
      && item.key === key && JSON.parse(item.componentDescription).id === 'work-board');
    assert.ok(tool);
    return (await sendStdin('call', 'kanban', JSON.stringify({
      pageId: discovery.pageId,
      discoveryId: discovery.discoveryId,
      name: tool.name,
      input,
    }))).result;
  };
  /**
   * @param {string} source
   * @param {string} destination
   */
  let drag = async (source, destination) => {
    let card = await page.$(source);
    let column = await page.$(destination);
    assert.ok(card);
    assert.ok(column);
    await card.dragAndDrop(column);
  };
  /** @param {string} selector */
  let beginDrag = (selector) => page.$eval(selector, (element) => {
    let transfer = new DataTransfer();
    Reflect.set(window, 'kanbanDragTransfer', transfer);
    element.dispatchEvent(new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    }));
  });
  /** @param {string} selector */
  let drop = (selector) => page.$eval(selector, (element) => {
    element.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: Reflect.get(window, 'kanbanDragTransfer'),
    }));
  });
  let initial = await rows();
  assert.equal(await page.$eval(`${cardA} h4`, (element) => element.textContent), '<b>Alpha</b>');
  assert.equal(await page.$(`${cardA} b`), null);
  assert.equal(await page.$eval(`${board} li[data-unassigned] h3 span`, (element) => element.textContent), 'Unassigned');
  assert.equal(await page.$eval(`${board} li[data-unassigned] h3 output`, (element) => element.textContent), '2');
  assert.equal(await page.$eval(`${board} li[data-record-id="d"] h4`, (element) => element.textContent), '0');
  assert.equal(await page.$eval(`${board} li[data-record-id="b"] .agui-kanban-description`, (element) => element.textContent), 'false');
  assert.equal(await page.$(`${board} select`), null);
  assert.equal(await page.$eval(cardA, (element) => Reflect.get(element, 'draggable')), true);
  await drag('#other-board li[data-record-id="a"]', `${board} li[data-status="done"]`);
  assert.deepEqual(await rows(), initial);
  await drag(cardA, `${board} li[data-status="locked"]`);
  assert.deepEqual(await rows(), initial);
  await beginDrag(cardA);
  await page.keyboard.press('Escape');
  await drop(`${board} li[data-status="done"]`);
  assert.deepEqual(await rows(), initial);
  await beginDrag(cardA);
  await update({
    readonly: true,
  });
  await drop(`${board} li[data-status="done"]`);
  assert.deepEqual(await rows(), initial);
  await update({
    readonly: false,
  });
  await cli('events', 'kanban');
  await drag(cardA, `${board} li[data-status="done"]`);
  await page.waitForFunction(() => document.activeElement?.closest('li[data-record-id]')?.getAttribute('data-record-id') === 'a');
  assert.equal(await page.$eval(cardA, (element) => element.parentElement?.closest('li[data-status]')?.getAttribute('data-status')), 'done');
  assert.equal((await rows())[0].amount, 0);
  assert.equal(await page.$eval('#work-table tr[data-row-id="a"] td[data-column="stage"]', (element) => element.textContent?.trim()), 'done');
  assert.equal(await page.$eval('#other-board li[data-record-id="a"]', (element) => element.parentElement?.closest('li[data-status]')?.getAttribute('data-status')), 'todo');
  assert.equal(await readRuntimeCache('kanban'), undefined);
  let events = (await cli('events', 'kanban')).events.filter((/** @type {{data: {widgetId?: string}}} */ event) => event.data.widgetId === 'work-board');
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].data, {
    widgetId: 'work-board',
    context: null,
    action: 'kanban-change',
    recordId: 'a',
    status: 'done',
    totalCount: 4,
  });
  assert.deepEqual(await call('move_item', {
    id: 'a',
    status: 'done',
  }), {
    changed: false,
    recordId: 'a',
    status: 'done',
    totalCount: 4,
  });
  assert.equal((await cli('events', 'kanban')).events.length, 0);
  await page.focus(cardA);
  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Alt');
  assert.equal((await rows())[0].stage, 'todo');
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-record-id') === 'a');
  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.up('Alt');
  assert.equal((await rows())[0].stage, 'done');
  await cli('events', 'kanban');
  await assert.rejects(call('move_item', {
    id: 'a',
    status: 'locked',
  }));
  await page.click('#work-toolbar button:nth-child(2)');
  assert.deepEqual(await rows(), initial);
  assert.equal(await page.$eval(cardA, (element) => element.parentElement?.closest('li[data-status]')?.getAttribute('data-status')), 'todo');
  await call('move_item', {
    id: 'a',
    status: 'done',
  });
  await page.click('#work-toolbar button');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#work-toolbar') || {}, 'submission')?.result?.state === 'committed');
  assert.match((await readRuntimeCache('kanban'))?.html || '', /"stage":"done"/);
  await call('move_item', {
    id: 'a',
    status: 'todo',
  });
  await page.click('#work-toolbar button:nth-child(2)');
  assert.equal((await rows())[0].stage, 'done');
  let discovery = await cli('tools', 'kanban');
  let cardTool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === 'agui-kanban-card' && item.key === 'set_status'
    && JSON.parse(item.componentDescription).boardId === 'work-board' && JSON.parse(item.componentDescription).recordId === 'c');
  assert.ok(cardTool);
  await sendStdin('call', 'kanban', JSON.stringify({
    pageId: discovery.pageId,
    discoveryId: discovery.discoveryId,
    name: cardTool.name,
    input: {
      status: 'todo',
    },
  }));
  assert.equal((await rows())[2].stage, 'todo');
  assert.equal((await call('read_view', {
    status: '',
  })).items[0].id, 'd');
  await page.click('#work-table tr[data-row-id="a"] input');
  await cli('events', 'kanban');
  await update({
    records: initial.filter((/** @type {{key: string}} */ row) => row.key !== 'a'),
  });
  assert.equal((await cli('events', 'kanban')).events.length, 0);
  assert.equal(await page.$(cardA), null);
  assert.equal(await page.$eval('#work-data', (element) => Reflect.get(element, '$').selected[0]), 'a');
  for (let property of [
    'readonly',
    'disabled',
  ]) {
    await update({
      [property]: true,
    });
    assert.equal(await page.$eval(`${board} li[data-record-id]`, (element) => Reflect.get(element, 'draggable')), false);
    assert.equal(await page.$eval(board, (element) => {
      try { Reflect.get(element, 'moveItem')('b', 'todo'); return false; }
      catch { return true; }
    }), true);
    await update({
      [property]: false,
    });
  }
  await update({
    records: [
      initial[0],
      initial[0],
    ],
  });
  assert.equal(await page.$eval(`${board} > p[role="status"]`, (element) => element.textContent), 'Invalid record IDs');
  await update({
    records: initial,
    loading: true,
  });
  assert.equal(await page.$eval(`${board} > p[role="status"]`, (element) => element.textContent), 'Loading work');
  assert.deepEqual((await call('read_view')).items, []);
  await update({
    loading: false,
    error: 'External board error',
  });
  assert.equal(await page.$eval(`${board} > p[role="status"]`, (element) => element.textContent), 'External board error');
  await update({
    error: '',
  });
  await cli('share', 'kanban');
  let viewer = await browser.newPage();
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelectorAll('#work-board li[data-record-id]').length === 4;
  });
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert && !frame.contentWindow?.customElements.get('agui-kanban');
  }), true);
  await page.bringToFront();
  await call('move_item', {
    id: 'a',
    status: 'done',
  });
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    let card = frame?.contentDocument?.querySelector('#work-board li[data-record-id="a"]');
    return card?.parentElement?.closest('li[data-status]')?.getAttribute('data-status') === 'done';
  }, {
    polling: 50,
  });
  let catalog = await cli('tools', 'kanban');
  let owners = catalog.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName.startsWith('agui-kanban'))
    .map((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerId);
  await page.$eval(board, (element) => { Reflect.set(window, 'oldBoard', element); });
  await page.$eval(`${board} agui-kanban-card`, (element) => { Reflect.set(window, 'oldCard', element); });
  // Explicitly discard committed fixture data when removing its provider.
  await cli('clear', 'kanban');
  await page.waitForFunction(() => Reflect.get(window, 'oldBoard').allSubs.size === 0 && Reflect.get(window, 'oldCard').allSubs.size === 0);
  assert.equal((await cli('tools', 'kanban')).tools.some((/** @type {import('../../types/tools.js').PageTool} */ item) => owners.includes(item.ownerId)), false);
  assert.deepEqual(errors, []);
});
