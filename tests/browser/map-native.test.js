import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('native map tools stay registered through zoom and expose current viewport state', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 30_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'map-native').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'map-native', '--no-open');
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--enable-blink-features=WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await insertStdin('map-native', '<context-provider id="map-state" ctx="MAP"><script type="application/json">{"rows":[{"id":"a","label":"Example","latitude":51.5,"longitude":0}],"view":{"center":[51.5,0],"zoom":12},"texts":{"zoomIn":"Zoom in","zoomOut":"Zoom out","unavailable":"Map unavailable"}}</script><agui-map id="map" label="Map" view-pub-to="MAP/view" bind="$.rows: MAP/rows; $.view: MAP/view; $.texts: MAP/texts"></agui-map></context-provider>');
  await page.waitForSelector('#map .agui-map-marker');
  let catalog = await cli('tools', 'map-native');
  let mapTools = catalog.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ entry) => entry.ownerName === 'agui-map'
    && JSON.parse(entry.componentDescription).id === 'map');
  let tool = mapTools.find((/** @type {import('../../types/tools.js').PageTool} */ entry) => entry.key === 'read_view');
  assert.ok(tool);
  await page.evaluate((names) => {
    let context = Reflect.get(document, 'modelContext');
    let register = context.registerTool.bind(context);
    Reflect.set(window, 'mapReregistrations', []);
    context.registerTool = (/** @type {{ name: string }} */ tool, /** @type {unknown} */ options) => {
      if (names.includes(tool.name)) { Reflect.get(window, 'mapReregistrations').push(tool.name); }
      return register(tool, options);
    };
  }, mapTools.map((/** @type {import('../../types/tools.js').PageTool} */ entry) => entry.name));
  for (let zoom of [
    13,
    12,
    13,
  ]) {
    await page.locator(`#map ::-p-aria([name="${zoom === 13 ? 'Zoom in' : 'Zoom out'}"][role="button"])`).click();
    await page.waitForFunction((value) => Reflect.get(document.querySelector('#map-state') || {}, '$')?.view.zoom === value, {}, zoom);
  }
  assert.deepEqual(await page.evaluate(() => Reflect.get(window, 'mapReregistrations')), [], 'Viewport changes do not replace map registrations.');
  let view = await page.evaluate(async (name) => {
    let context = /** @type {import('../../types/webmcp.js').NativeWebMCPContext} */ (Reflect.get(document, 'modelContext'));
    let tool = (await context.getTools()).find((entry) => entry.name === name);
    if (!tool) { throw new Error('The map read tool is missing.'); }
    return JSON.parse(await context.executeTool(tool, {}));
  }, tool.name);
  assert.equal(view.view.zoom, 13);
  await page.$eval('#map', (element) => { Reflect.set(window, 'zoomingMap', element); });
  await insertStdin('map-native', '<p>Removed after zooming</p>');
  await page.waitForFunction(() => Reflect.get(window, 'zoomingMap').allSubs.size === 0);
  let remaining = (await cli('tools', 'map-native')).tools;
  let owners = new Set(mapTools.map((/** @type {import('../../types/tools.js').PageTool} */ entry) => entry.ownerId));
  assert.equal(remaining.some((/** @type {import('../../types/tools.js').PageTool} */ entry) => owners.has(entry.ownerId)), false);
  assert.deepEqual(errors, []);
});
