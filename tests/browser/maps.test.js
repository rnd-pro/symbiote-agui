import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { MAP_RUNTIME_PATH, MAP_CSS_PATH, MAP_ASSET_PREFIX } from '../../src/page/client/uilib/widgets/map/constants.js';
import { CLIENT_SCRIPT_PATH } from '../../src/markup/constants.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('maps load packaged dependencies once, synchronize stable IDs and view without echoes, and mirror inert viewport geometry', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'maps').catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'maps', '--no-open');
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  await page.setViewport({
    width: 1000,
    height: 1200,
  });
  /** @type {string[]} */
  let errors = [];
  /** @type {import('puppeteer-core').HTTPRequest[]} */
  let pending = [];
  /** @type {string[]} */
  let referrers = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  /** @param {import('puppeteer-core').HTTPRequest} request */
  let respondTile = (request) => request.respond({
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64'),
  });
  page.on('request', (request) => {
    let url = new URL(request.url());
    if (url.pathname === MAP_RUNTIME_PATH || url.pathname === MAP_CSS_PATH) { pending.push(request); }
    else if (url.hostname === 'tiles.example.test') { referrers.push(request.headers().referer ?? ''); respondTile(request); }
    else { request.continue(); }
  });
  let mainResponse = page.waitForResponse((response) => new URL(response.url()).pathname === CLIENT_SCRIPT_PATH);
  await page.goto(session.url);
  assert.equal((await (await mainResponse).text()).includes('_leaflet_id'), false);
  assert.equal(pending.length, 0);
  let css = await fetch(new URL(MAP_CSS_PATH, session.url));
  assert.equal(css.status, 200);
  assert.match(await css.text(), /url\(\/client\/uilib\/widgets\/map\/images\//);
  let asset = await fetch(new URL(`${MAP_ASSET_PREFIX}marker-icon.png`, session.url));
  assert.equal(asset.headers.get('content-type'), 'image/png');
  assert.equal((await fetch(new URL(`${MAP_ASSET_PREFIX}unknown.png`, session.url))).status, 404);
  await insertStdin('maps', await readFile(new URL('./maps.html', import.meta.url), 'utf8'));
  await page.waitForFunction(() => document.querySelector('#first-map > agui-state p')?.textContent === 'Loading map');
  await page.waitForFunction(() => !Reflect.get(document.querySelector('#first-map') || {}, '$')?.runtimeReady);
  /** @param {Record<string, unknown>} values */
  let update = (values) => sendStdin('update', 'maps', JSON.stringify({
    selector: '#map-data',
    values,
  }));
  await update({
    ids: [
      'a',
    ],
    view: {
      center: [
        51.505,
        -0.11,
      ],
      zoom: 13,
    },
  });
  await page.$eval('#late-map', (element) => { Reflect.set(window, 'removedMap', element); element.remove(); });
  await page.waitForFunction(() => Reflect.get(window, 'removedMap').allSubs.size === 0);
  assert.equal(pending.filter((request) => new URL(request.url()).pathname === MAP_RUNTIME_PATH).length, 1);
  assert.equal(pending.filter((request) => new URL(request.url()).pathname === MAP_CSS_PATH).length, 1);
  for (let request of pending) { await request.continue(); }
  await page.waitForSelector('#first-map .agui-map-marker[data-record-id="b"]');
  assert.equal(await page.$eval('#first-map .agui-map-skipped', (element) => element.textContent?.trim()), 'Skipped coordinates: 1');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'removedMap').renderer), undefined);
  assert.equal((await cli('events', 'maps')).events.length, 0);
  /** @param {string} key
   * @param {Record<string, unknown>} [input]
   */
  let call = async (key, input = {}) => {
    let discovery = await cli('tools', 'maps');
    let tool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerName === 'agui-map'
      && item.key === key && JSON.parse(item.componentDescription).id === 'first-map');
    assert.ok(tool, key);
    return (await sendStdin('call', 'maps', JSON.stringify({
      pageId: discovery.pageId,
      discoveryId: discovery.discoveryId,
      name: tool.name,
      input,
    }))).result;
  };
  let ids = () => page.$eval('#map-data', (element) => Reflect.get(element, '$').ids);
  assert.equal((await call('read_view')).skippedCount, 1);
  await page.click('#first-map .agui-map-marker[data-record-id="b"]');
  assert.deepEqual(await ids(), [
    'a',
    'b',
  ]);
  await page.click('#first-map .agui-map-marker[data-record-id="a"]');
  assert.equal(await page.$('#first-map .leaflet-popup b'), null);
  assert.equal(await page.$eval('#first-map .leaflet-popup-content', (element) => element.textContent), '<b>Alpha</b>');
  assert.deepEqual(await ids(), [
    'b',
  ]);
  await page.click('#first-map > details > summary');
  await page.$eval('#first-map > details', (element) => Promise.all(element.getAnimations({
    subtree: true,
  }).map((animation) => animation.finished.catch(() => {}))));
  await page.click('#first-map agui-map-data tr[data-row-id="a"] input');
  assert.deepEqual(await ids(), [
    'b',
    'a',
  ]);
  await cli('events', 'maps');
  assert.equal((await call('set_selection', {
    ids: [
      'a',
      'b',
    ],
  })).changed, false);
  let view = (await call('read_view')).view;
  assert.equal((await call('set_view', view)).changed, false, JSON.stringify(view));
  assert.equal((await cli('events', 'maps')).events.length, 0);
  // World bounds must not silently clamp an accepted center at low zoom.
  let polarView = {
    center: [
      80,
      170,
    ],
    zoom: 2,
  };
  await call('set_view', polarView);
  assert.deepEqual((await call('read_view')).view, polarView);
  await call('set_view', view);
  await cli('events', 'maps');
  await page.click('#first-map agui-toolbar button:nth-child(2)');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#map-data') || {}, '$')?.view.zoom === 14);
  assert.equal((await cli('events', 'maps')).events.filter((/** @type {{ data?: { action?: string } }} */ event) => event.data?.action === 'map-view-change').length, 1);
  await page.click('#first-map agui-toolbar button:nth-child(3)');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#map-data') || {}, '$')?.view.zoom === 13);
  await cli('events', 'maps');
  let canvas = await page.$('#first-map .agui-map-canvas');
  assert.ok(canvas);
  await canvas.scrollIntoView();
  let box = await canvas.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 130, box.y + 70, {
    steps: 5,
  });
  await page.mouse.up();
  await page.waitForFunction(() => Reflect.get(document.querySelector('#map-data') || {}, '$')?.view.center[0] !== 51.505);
  let events = (await cli('events', 'maps')).events.filter((/** @type {{ data?: { action?: string } }} */ event) => event.data?.action === 'map-view-change');
  assert.equal(events.length, 1);
  assert.equal((await call('fit_records')).changed, true);
  await update({
    readonly: true,
  });
  assert.equal(await page.$eval('#first-map', (element) => {
    try {
      Reflect.get(element, 'setView')({
        center: [
          0,
          0,
        ],
        zoom: 2,
      });
      return false;
    }
    catch { return true; }
  }), true);
  await update({
    readonly: false,
    loading: true,
  });
  assert.equal(await page.$eval('#first-map > agui-state p', (element) => element.textContent), 'Loading map');
  await update({
    loading: false,
  });
  await page.waitForSelector('#first-map .agui-map-marker');
  assert.ok(referrers.length);
  assert.ok(referrers.every((referer) => referer === `${new URL(session.url).origin}/`));
  let failure = await browser.newPage();
  await failure.setRequestInterception(true);
  failure.on('request', (request) => new URL(request.url()).pathname === MAP_CSS_PATH ? request.abort() : request.continue());
  await failure.goto(session.url);
  await failure.waitForFunction(() => document.querySelector('#first-map > agui-state p')?.textContent === 'Map dependency failed');
  assert.equal(await failure.$('.leaflet-container'), null);
  await failure.close();
  await cli('share', 'maps');
  let viewer = await browser.newPage();
  await viewer.setViewport({
    width: 600,
    height: 800,
  });
  let viewerDependencies = 0;
  /** @type {string[]} */
  let viewerReferrers = [];
  await viewer.setRequestInterception(true);
  viewer.on('request', (request) => {
    let url = new URL(request.url());
    if (url.pathname === MAP_RUNTIME_PATH || url.pathname === MAP_CSS_PATH) { viewerDependencies += 1; }
    if (url.hostname === 'tiles.example.test') { viewerReferrers.push(request.headers().referer ?? ''); respondTile(request); }
    else { request.continue(); }
  });
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#first-map .agui-map-snapshot foreignObject .leaflet-tile');
  });
  assert.equal(viewerDependencies, 0);
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert && !frame.contentWindow?.customElements.get('agui-map');
  }), true);
  assert.ok(viewerReferrers.length);
  assert.ok(viewerReferrers.every((referer) => referer === `${new URL(session.url).origin}/`));
  let owners = (await cli('tools', 'maps')).tools.filter((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-map' || tool.ownerName === 'agui-map-data')
    .map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerId);
  await page.bringToFront();
  await page.$eval('#first-map', (element) => { Reflect.set(window, 'oldMap', element); });
  await insertStdin('maps', '<p>Replaced</p>');
  await page.waitForFunction(() => Reflect.get(window, 'oldMap').allSubs.size === 0 && !Reflect.get(window, 'oldMap').renderer);
  assert.equal((await cli('tools', 'maps')).tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => owners.includes(tool.ownerId)), false);
  assert.deepEqual(errors, []);
});
