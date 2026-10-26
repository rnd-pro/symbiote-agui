import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { CHART_RUNTIME_PATH } from '../../src/page/client/uilib/widgets/chart/constants.js';
import { CLIENT_SCRIPT_PATH } from '../../src/markup/constants.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('chart dependencies load once on initialization, render SVG, select source IDs, and stay absent from viewers', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'charts').catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'charts', '--no-open');
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
      value: 'reduce',
    },
  ]);
  await page.setViewport({
    width: 1000,
    height: 1400,
  });
  /** @type {string[]} */
  let errors = [];
  /** @type {import('puppeteer-core').HTTPRequest[]} */
  let runtimeRequests = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === CHART_RUNTIME_PATH) { runtimeRequests.push(request); }
    else { request.continue(); }
  });
  let mainResponse = page.waitForResponse((response) => new URL(response.url()).pathname === CLIENT_SCRIPT_PATH);
  await page.goto(session.url);
  assert.equal((await (await mainResponse).text()).includes('stillShowZeroSum'), false);
  assert.equal(runtimeRequests.length, 0);
  let html = await readFile(new URL('./charts.html', import.meta.url), 'utf8');
  await insertStdin('charts', html);
  await page.waitForFunction(() => document.querySelector('#line-chart > agui-state p')?.textContent === 'Loading chart');
  assert.equal(runtimeRequests.length, 1);
  assert.equal((await cli('tools', 'charts')).tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-chart' && tool.key === 'set_selection'), false);
  /** @param {Record<string, unknown>} values */
  let update = (values) => sendStdin('update', 'charts', JSON.stringify({
    selector: '#chart-data',
    values,
  }));
  let rows = [
    {
      key: 'a',
      name: '<b>Alpha</b>',
      revenue: 3,
      cost: 1,
    },
    {
      key: 'b',
      name: 'Beta',
      revenue: 20,
      cost: 4,
    },
    {
      key: 'c',
      name: 'Gamma',
      revenue: 7,
      cost: 2,
    },
  ];
  await update({
    rows,
    ids: [
      'a',
    ],
  });
  await page.$eval('#moving-chart', (element) => {
    // Retain the whole component subtree while the module request is held.
    for (let component of [
      element,
      ...element.querySelectorAll('*'),
    ]) {
      if ('destructionDelay' in component) { Reflect.set(component, 'destructionDelay', 10_000); }
    }
    Reflect.set(window, 'movingChart', element);
    element.remove();
  });
  await page.$eval('#late-chart', (element) => {
    Reflect.set(window, 'removedChart', element);
    element.remove();
  });
  await page.waitForFunction(() => Reflect.get(window, 'removedChart').allSubs.size === 0);
  await runtimeRequests[0].continue();
  for (let id of [
    'line-chart',
    'bar-chart',
    'donut-chart',
  ]) { await page.waitForSelector(`#${id} .agui-chart-plot svg`); }
  await page.$eval('#chart-data', (element) => {
    let chart = Reflect.get(window, 'movingChart');
    element.append(chart);
    for (let component of [
      chart,
      ...chart.querySelectorAll('*'),
    ]) {
      if ('destructionDelay' in component) { Reflect.set(component, 'destructionDelay', 100); }
    }
  });
  await page.waitForSelector('#moving-chart .agui-chart-plot svg');
  assert.equal(runtimeRequests.length, 1);
  assert.equal(await page.$eval('#bar-chart agui-chart-data td[data-column="s0"]', (element) => element.textContent?.trim()), '3');
  assert.equal(await page.$('agui-chart canvas'), null);
  assert.equal(await page.$('agui-chart b'), null);
  assert.equal(await page.evaluate(() => Reflect.get(window, 'removedChart').renderer), undefined);
  assert.equal((await cli('events', 'charts')).events.length, 0);
  /** @param {string} key
   * @param {Record<string, unknown>} [input]
   */
  let call = async (key, input = {}) => {
    let discovery = await cli('tools', 'charts');
    let tool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === 'agui-chart'
      && item.key === key && JSON.parse(item.componentDescription).id === 'bar-chart');
    assert.ok(tool);
    return (await sendStdin('call', 'charts', JSON.stringify({
      pageId: discovery.pageId,
      discoveryId: discovery.discoveryId,
      name: tool.name,
      input,
    }))).result;
  };
  let ids = () => page.$eval('#chart-data', (element) => Reflect.get(element, '$').ids);
  // Choose a filled data mark below the legend for a real pointer event.
  let clickFirstBar = async () => {
    await page.waitForFunction(() => !Reflect.get(document.querySelector('#bar-chart') || {}, 'paintFrame'));
    let plot = await page.$('#bar-chart .agui-chart-plot');
    assert.ok(plot);
    await plot.scrollIntoView();
    let point = await plot.evaluate((element) => {
      let top = element.getBoundingClientRect().top;
      let bars = Array.from(element.querySelectorAll('svg path')).filter((path) => {
        let box = path.getBoundingClientRect();
        return path.getAttribute('fill') !== 'none' && box.width > 20 && box.height > 10 && box.top > top + 30;
      }).sort((left, right) => left.getBoundingClientRect().left - right.getBoundingClientRect().left);
      let box = bars[0]?.getBoundingClientRect();
      if (!box) { throw new Error('No bar available for pointer selection.'); }
      return {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      };
    });
    await page.mouse.click(point.x, point.y);
  };
  await clickFirstBar();
  assert.deepEqual(await ids(), []);
  await call('set_selection', {
    ids: [
      'a',
    ],
  });
  await page.click('#bar-chart > details > summary');
  await page.$eval('#bar-chart > details', (element) => Promise.all(element.getAnimations({
    subtree: true,
  }).map((animation) => animation.finished.catch(() => {}))));
  await page.click('#bar-chart agui-chart-data tr[data-row-id="b"] input');
  assert.deepEqual(await ids(), [
    'a',
    'b',
  ], JSON.stringify(await page.$eval('#bar-chart agui-chart-data', (element) => ({
    selection: Reflect.get(element, '$').selection,
    unavailable: Reflect.get(element, '$').unavailable,
  }))));
  await cli('events', 'charts');
  assert.equal((await call('set_selection', {
    ids: [
      'b',
      'a',
    ],
  })).changed, false);
  assert.equal((await cli('events', 'charts')).events.length, 0);
  await update({
    rows: rows.slice().reverse(),
  });
  assert.deepEqual((await call('read_selection')).items, [
    'a',
    'b',
  ]);
  assert.equal((await call('read_view')).items[0].id, 'c');
  await clickFirstBar();
  assert.deepEqual(await ids(), [
    'a',
    'b',
    'c',
  ]);
  await clickFirstBar();
  assert.deepEqual(await ids(), [
    'a',
    'b',
  ]);
  await update({
    readonly: true,
  });
  assert.equal(await page.$eval('#bar-chart', (element) => {
    try { Reflect.get(element, 'setSelection')([]); return false; }
    catch { return true; }
  }), true);
  await update({
    readonly: false,
    rows: rows.filter((row) => row.key !== 'a'),
  });
  assert.deepEqual((await call('read_selection')).items, [
    'b',
  ]);
  assert.deepEqual(await ids(), [
    'a',
    'b',
  ]);
  await update({
    rows: [
      rows[0],
      rows[0],
    ],
  });
  assert.equal(await page.$eval('#bar-chart > agui-state p', (element) => element.textContent), 'Invalid chart records');
  await update({
    rows,
    loading: true,
  });
  assert.equal(await page.$eval('#bar-chart > agui-state p', (element) => element.textContent), 'Loading chart');
  await update({
    loading: false,
  });
  await page.waitForSelector('#bar-chart .agui-chart-plot svg');
  await update({
    rows: Array.from({
      length: 22,
    }, (_, index) => ({
      key: `point-${index}`,
      name: `Point ${index}`,
      revenue: index,
      cost: index,
    })),
  });
  await page.click('#moving-chart > details > summary');
  await page.$eval('#moving-chart > details', (element) => Promise.all(element.getAnimations({
    subtree: true,
  }).map((animation) => animation.finished.catch(() => {}))));
  await page.click('#moving-chart .agui-table-pagination button:last-child');
  assert.equal(await page.$$eval('#moving-chart tbody tr', (rows) => rows.length), 2);
  await update({
    rows,
  });
  let failed = await browser.newPage();
  await failed.setRequestInterception(true);
  failed.on('request', (request) => new URL(request.url()).pathname === CHART_RUNTIME_PATH ? request.abort() : request.continue());
  await failed.goto(session.url);
  await failed.waitForFunction(() => document.querySelector('#bar-chart > agui-state p')?.textContent === 'Chart dependency failed');
  assert.equal(await failed.$('agui-chart svg'), null);
  await failed.close();
  await cli('share', 'charts');
  let viewer = await browser.newPage();
  let viewerRuntimeRequests = 0;
  viewer.on('request', (request) => { if (new URL(request.url()).pathname === CHART_RUNTIME_PATH) { viewerRuntimeRequests += 1; } });
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#bar-chart .agui-chart-plot svg');
  });
  assert.equal(viewerRuntimeRequests, 0);
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert && !frame.contentWindow?.customElements.get('agui-chart');
  }), true);
  await page.bringToFront();
  await page.$eval('#bar-chart', (element) => { Reflect.set(window, 'oldChart', element); });
  let discovery = await cli('tools', 'charts');
  let owners = discovery.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-chart' || tool.ownerName === 'agui-chart-data')
    .map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerId);
  await insertStdin('charts', '<p>Replaced</p>');
  await page.waitForFunction(() => Reflect.get(window, 'oldChart').allSubs.size === 0 && !Reflect.get(window, 'oldChart').renderer);
  assert.equal((await cli('tools', 'charts')).tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => owners.includes(tool.ownerId)), false);
  assert.deepEqual(errors, []);
});
