import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { localAssetsFixture } from './local-assets-fixture.js';

for (let publicPage of [
  false,
  true,
]) {
  test(`published assets load ${publicPage ? 'through HTTPS' : 'locally'} with portable read-only viewer resources`, {
    timeout: 60_000,
  }, async (t) => {
    let f = await localAssetsFixture(t);
    let browser = await puppeteer.launch({
      executablePath: process.env.AGUI_TEST_BROWSER_PATH,
      headless: true,
      acceptInsecureCerts: true,
      args: [
        '--host-resolver-rules=MAP agui-test.trycloudflare.com 127.0.0.1',
        '--no-proxy-server',
        '--disable-blink-features=WebMCP,WebMCPTesting',
      ],
    });
    t.after(() => browser.close());
    let page = await browser.newPage();
    /** @type {string[]} */
    let errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(publicPage ? f.publicUrl : f.localUrl);
    await page.waitForFunction(() => document.getElementById('module-result')?.textContent === 'Loaded local module: 3');
    await page.waitForFunction(() => document.querySelector('#gallery-local-document h1')?.textContent === 'Published with this interface');
    let assets = await page.evaluate(async () => {
      let images = Array.from(document.querySelectorAll('#gallery-local-assets img, #svg-asset, #picture-asset'));
      for (let image of images) { await (/** @type {HTMLImageElement} */ (image)).decode(); }
      await document.fonts.load('16px AssetFixture');
      let svg = /** @type {HTMLImageElement} */ (document.getElementById('svg-asset'));
      let canvas = document.createElement('canvas');
      canvas.width = canvas.height = 8;
      let context = canvas.getContext('2d');
      if (!context) { throw new Error('Canvas unavailable.'); }
      context.drawImage(svg, 0, 0);
      let css = document.getElementById('css-asset');
      if (!css) { throw new Error('CSS fixture is missing.'); }
      return {
        imageWidths: images.map((image) => (/** @type {HTMLImageElement} */ (image)).naturalWidth),
        pixel: Array.from(context.getImageData(0, 0, 1, 1).data),
        fontLoaded: Array.from(document.fonts).some((font) => font.family === 'AssetFixture' && font.status === 'loaded'),
        cssLoaded: getComputedStyle(css).getPropertyValue('--asset-loaded').trim(),
        moduleRuns: Reflect.get(window, 'assetModuleRuns'),
      };
    });
    assert.ok(assets.imageWidths.every((width) => width > 0));
    assert.deepEqual(assets.pixel, [
      21,
      128,
      61,
      255,
    ]);
    assert.equal(assets.fontLoaded, true);
    assert.equal(assets.cssLoaded, 'yes');
    assert.equal(assets.moduleRuns, 1);
    let rawModule = await page.evaluate(async () => (await fetch('./_assets/modules/piece.html.js')).text());
    assert.match(rawModule, /export let label/);
    let imagePage = await browser.newPage();
    let response = await imagePage.goto(new URL('_assets/agui.png', page.url()).href);
    assert.ok(response);
    assert.deepEqual(await response.buffer(), await readFile(new URL('../../src/uilib/gallery.assets/agui.png', import.meta.url)));
    await imagePage.close();
    let viewer = await (await browser.createBrowserContext()).newPage();
    /** @type {string[]} */
    let requested = [];
    viewer.on('request', (request) => requested.push(new URL(request.url()).pathname));
    /** @type {string[]} */
    let diagnostics = [];
    viewer.on('console', (message) => { if (message.type() === 'error') { diagnostics.push(message.text()); } });
    viewer.on('response', (response) => { if (response.url().includes('/_assets/')) { diagnostics.push(`${response.status()} ${response.url()}`); } });
    await viewer.goto(f.viewerUrl);
    await viewer.waitForFunction(() => {
      let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
      let doc = frame?.contentDocument;
      let image = /** @type {HTMLImageElement | null} */ (doc?.querySelector('#gallery-local-document img'));
      return image?.complete && image.naturalWidth > 0 && doc?.getElementById('module-result')?.textContent === 'Loaded local module: 3';
    });
    let frame = await (await viewer.$('#agui-viewer'))?.contentFrame();
    assert.ok(frame);
    // Poll from the active parent; the mirrored document intentionally forbids scripts.
    await viewer.waitForFunction(() => {
      let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
      let doc = frame?.contentDocument;
      let css = doc?.getElementById('css-asset');
      return css && doc?.defaultView?.getComputedStyle(css).getPropertyValue('--asset-loaded').trim() === 'yes'
        && Array.from(doc.fonts).some((font) => font.family === 'AssetFixture' && font.status === 'loaded');
    }, {
      timeout: 5000,
    }).catch((error) => { throw new Error(JSON.stringify(diagnostics), {
      cause: error,
    }); });
    let mirrored = await frame.evaluate(async () => {
      await document.fonts.load('16px AssetFixture');
      let css = document.getElementById('css-asset');
      if (!css) { throw new Error('Mirrored CSS fixture is missing.'); }
      return {
        inert: document.body.inert,
        moduleRuns: Reflect.get(window, 'assetModuleRuns'),
        fontLoaded: Array.from(document.fonts).some((font) => font.family === 'AssetFixture' && font.status === 'loaded'),
        cssLoaded: getComputedStyle(css).getPropertyValue('--asset-loaded').trim(),
        preload: document.querySelector('link[rel="preload"]') !== null,
        imageUrl: (/** @type {HTMLImageElement} */ (document.querySelector('#gallery-local-document img'))).src,
      };
    });
    assert.equal(mirrored.inert, true);
    assert.equal(mirrored.moduleRuns, undefined);
    assert.equal(mirrored.preload, false);
    assert.equal(mirrored.fontLoaded, true);
    assert.equal(mirrored.cssLoaded, 'yes');
    assert.equal(new URL(mirrored.imageUrl).origin, new URL(f.viewerUrl).origin);
    assert.ok(requested.some((path) => path.endsWith('/_assets/agui.png')));
    assert.ok(requested.some((path) => path.endsWith('/_assets/fonts/icons.woff2')));
    assert.equal(requested.some((path) => /\.(?:md|mjs|js|json)$/.test(path) && path.includes('/_assets/')), false);
    let svgPage = await browser.newPage();
    await svgPage.goto(new URL('_assets/marker.svg', publicPage ? f.publicUrl : f.localUrl).href);
    assert.deepEqual(await svgPage.evaluate(() => ({
      executed: document.documentElement.getAttribute('data-executed'),
      origin: self.origin,
    })), {
      executed: null,
      origin: 'null',
    });
    let embedded = await page.evaluate((url) => new Promise((resolve) => {
      let frame = document.createElement('iframe');
      frame.onload = () => resolve(frame.contentDocument === null);
      frame.src = url;
      document.body.append(frame);
    }), new URL('_assets/marker.svg', page.url()).href);
    assert.equal(embedded, true, 'The response sandbox also isolates embedded SVG documents.');
    assert.deepEqual(errors, []);
  });
}
