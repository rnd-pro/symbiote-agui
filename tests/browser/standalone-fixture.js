import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import puppeteer from 'puppeteer';
import { jsBuild } from 'jsda-kit/server/build-asset.js';
import { closeServer, waitForServer } from '../../src/shared/server.js';
import { galleryExamples, galleryProviders } from './gallery-fixture.js';
import { mockIconFont } from './icon-font-fixture.js';

/**
 * @param {import('node:test').TestContext} t
 * @param {string} installedRoot
 * @param {string} consumerRoot
 */
export async function verifyStandaloneLibrary(t, installedRoot, consumerRoot) {
  let dist = join(installedRoot, 'uilib', 'dist');
  let requested = /** @type {string[]} */ ([]);
  let prefix = '/vendor/nested/uilib/';
  let assets = createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    let pathname = new URL(request.url || '', 'http://localhost').pathname;
    requested.push(pathname);
    let file = resolve(dist, pathname.slice(prefix.length));
    if (!pathname.startsWith(prefix) || !file.startsWith(`${dist}${sep}`)) {
      response.writeHead(404).end();
      return;
    }
    try {
      let bytes = await readFile(file);
      response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'image/png');
      response.end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  t.after(() => closeServer(assets));
  assets.listen(0, '127.0.0.1');
  let assetOrigin = await waitForServer(assets);
  let base = `${assetOrigin}${prefix}`;
  let source = join(consumerRoot, 'uilib-consumer.mjs');
  await writeFile(source, `
    import * as core from '@symbiotejs/symbiote';
    import * as native from '@symbiotejs/symbiote/html-app';
    import * as webmcp from '@symbiotejs/symbiote/webmcp';
    import * as library from 'symbiote-agui/uilib';
    library.registerUiLibComponents({assetBaseUrl: ${JSON.stringify(base)}});
    window.nativeExports = {
      ...webmcp,
      ...core,
      ...native,
    };
    window.library = library;
  `);
  let consumer = await jsBuild(source);
  let siteRequests = /** @type {string[]} */ ([]);
  let example = await readFile(join(installedRoot, 'docs', 'examples', 'standalone.html'), 'utf8');
  let site = createServer((request, response) => {
    let pathname = new URL(request.url || '', 'http://localhost').pathname;
    siteRequests.push(pathname);
    if (pathname === '/source.js') {
      response.writeHead(200, {
        'Content-Type': 'text/javascript',
      }).end(consumer);
    } else if (pathname === '/example') {
      response.writeHead(200, {
        'Content-Type': 'text/html',
      }).end(example.replaceAll('../../uilib/dist/', base));
    } else {
      response.writeHead(200, {
        'Content-Type': 'text/html',
      }).end(`<!doctype html>
        <script type="module">
          if (${JSON.stringify(pathname)} === '/source') {
            await import('./source.js');
          } else { window.library = await import(${JSON.stringify(`${base}index.js`)}); }
          let {Symbiote, html} = window.library;
          class FixtureValue extends Symbiote {}
          FixtureValue.template = html\`<output bind="textContent: FIXTURE/name"></output>\`;
          FixtureValue.reg('fixture-value');
          window.ready = true;
        </script>
        <sym-context ctx="FIXTURE">
          <script type="application/json">{"name":"Initial"}</script>
          <agui-field label="Name" pub-to="FIXTURE/name" bind="$.value: FIXTURE/name"></agui-field>
          <fixture-value></fixture-value>
        </sym-context>`);
    }
  });
  t.after(() => closeServer(site));
  site.listen(0, '127.0.0.1');
  let origin = await waitForServer(site);
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  t.after(() => browser.close());
  let sourcePage = await browser.newPage();
  await mockIconFont(sourcePage);
  await sourcePage.goto(`${origin}/source`);
  await sourcePage.waitForFunction(() => Reflect.get(window, 'ready'));
  let nativeExports = await sourcePage.evaluate(() => {
    let native = Reflect.get(window, 'nativeExports');
    let library = Reflect.get(window, 'library');
    for (let key of Object.keys(native)) {
      if (library[key] !== native[key]) { throw new Error(`Different source foundation export: ${key}`); }
    }
    return Object.keys(native);
  });
  await sourcePage.locator('agui-field input').fill('Source binding');
  await sourcePage.waitForFunction(() => document.querySelector('fixture-value output')?.textContent === 'Source binding');
  await sourcePage.close();

  let page = await browser.newPage();
  await mockIconFont(page);
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.evaluateOnNewDocument(() => {
    Reflect.set(window, 'sockets', 0);
    window.WebSocket = class extends WebSocket {
      /**
       * @param {string | URL} url
       * @param {string | string[]} [protocols]
       */
      constructor(url, protocols) {
        Reflect.set(window, 'sockets', Reflect.get(window, 'sockets') + 1);
        super(url, protocols);
      }
    };
    Reflect.deleteProperty(Element.prototype, 'setHTML');
  });
  await page.goto(`${origin}/prepared`);
  await page.waitForFunction(() => Reflect.get(window, 'ready'));
  assert.equal(requested.some((path) => path.includes('/widgets/')), false, 'Widgets remain deferred before initialization.');
  await page.evaluate(async (options) => {
    let library = Reflect.get(window, 'library');
    let foundation = await import(`${options.base}foundation.js`);
    for (let key of options.nativeExports.concat('PubSub')) {
      if (library[key] !== foundation[key]) { throw new Error(`Different prepared foundation export: ${key}`); }
    }
    if (library.Symbiote.mcpToolMode) { throw new Error('Global WebMCP was enabled automatically.'); }
    let repeated = await import(`${options.base}index.js?repeat`);
    if (library.SymContext !== repeated.SymContext) { throw new Error('Repeated bootstrap created another runtime.'); }
    let conflict = false;
    try {
      library.registerUiLibComponents({
        themeToggle: class extends library.ThemeToggle {},
      });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'NotSupportedError') { throw error; }
      conflict = true;
    }
    if (!conflict) { throw new Error('A conflicting constructor was accepted.'); }
  }, {
    base,
    nativeExports,
  });
  assert.equal(await page.$$eval(`link[href="${base}styles.css"]`, (links) => links.length), 1);
  await page.locator('agui-field input').fill('Prepared binding');
  await page.waitForFunction(() => document.querySelector('fixture-value output')?.textContent === 'Prepared binding');

  let examples = await galleryExamples();
  let mapDefaults = examples.querySelector('sym-context[ctx="MAP"] > script');
  assert.ok(mapDefaults);
  let locations = JSON.parse(mapDefaults.textContent || '{}');
  locations.mapTiles = null;
  mapDefaults.textContent = JSON.stringify(locations);
  let widgets = [
    'agui-chart',
    'agui-map',
    'agui-diagram',
    'agui-markdown',
  ].map((tag) => {
    let widget = examples.querySelector(tag);
    assert.ok(widget, tag);
    return widget.outerHTML;
  }).join('\n');
  await page.evaluate((html) => {
    let component = document.createElement('sym-component');
    component.innerHTML = html;
    document.body.append(component);
  }, `${galleryProviders(examples)}${widgets}`);
  try {
    await page.waitForSelector('agui-chart .agui-chart-plot svg');
    await page.waitForSelector('agui-map .leaflet-container');
    await page.waitForSelector('agui-diagram svg');
    await page.waitForSelector('agui-markdown h1');
  } catch (cause) {
    let widgets = await page.$$eval('agui-chart, agui-map, agui-diagram, agui-markdown', (elements) => elements.map((element) => ({
      tag: element.localName,
      status: Reflect.get(element, '$').statusMessage,
      error: Reflect.get(element, 'runtimeError'),
      failed: Reflect.get(element, 'loadFailed'),
      issue: Reflect.get(element, 'issue'),
    })));
    throw new Error(JSON.stringify({
      errors,
      widgets,
      requested,
    }), {
      cause,
    });
  }
  for (let asset of [
    'widgets/chart/runtime/index.js',
    'widgets/map/runtime/index.js',
    'widgets/map/leaflet.css',
    'widgets/diagram/runtime/index.js',
    'widgets/markdown/runtime/index.js',
    'widgets/markdown/sanitizer/index.js',
  ]) { assert.ok(requested.includes(`${prefix}${asset}`), `Loaded relocated asset: ${asset}`); }
  await page.goto(`${origin}/example`);
  await page.waitForSelector('agui-table tbody tr[data-row-id="draft"]');
  await page.locator('agui-field input').fill('Shared workspace');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Shared workspace');
  await page.locator('agui-table tr[data-row-id="draft"] td[data-column="name"]').click();
  assert.deepEqual(await page.$eval('sym-context', (provider) => Reflect.get(provider, '$').selected), [
    'draft',
  ]);
  await page.locator('agui-table tr[data-row-id="review"] td[data-column="name"]').click();
  assert.deepEqual(await page.$eval('sym-context', (provider) => Reflect.get(provider, '$').selected), [
    'draft',
    'review',
  ]);
  await page.locator('agui-theme-toggle button').click();
  await page.waitForFunction(() => document.body.dataset.theme === 'dark');
  assert.equal(await page.$eval('sym-context', (provider) => Reflect.get(provider, '$').theme), 'dark');
  await page.locator('agui-theme-selector > button:not(:disabled)').click();
  await page.locator('.agui-theme-option[value="ocean"]').click();
  await page.waitForFunction(() => document.body.dataset.palette === 'ocean');
  assert.equal(await page.$eval('sym-context', (provider) => Reflect.get(provider, '$').palette), 'ocean');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForSelector('agui-table tbody tr[data-row-id="draft"]');
  assert.deepEqual(await page.$eval('sym-context', (provider) => Reflect.get(provider, '$').selected), []);
  assert.equal(await page.$eval('sym-context', (provider) => Reflect.get(provider, '$').name), 'My workspace');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'sockets')), 0);
  assert.deepEqual(siteRequests.filter((path) => ![
    '/source',
    '/source.js',
    '/prepared',
    '/example',
    '/favicon.ico',
  ].includes(path)), []);
  assert.deepEqual(errors, []);
  await browser.close();
  await closeServer(site);
  await closeServer(assets);
}
