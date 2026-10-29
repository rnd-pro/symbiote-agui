import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import puppeteer from 'puppeteer-core';
import { withTimeout } from '../../src/shared/timeout.js';
import { assetProxyFixture } from './asset-proxy-fixture.js';
import { upstreamResponse } from '../node/proxy-http-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

for (let publicPage of [
  false,
  true,
]) {
  test(`native assets and Markdown use the session proxy ${publicPage ? 'through the HTTPS tunnel' : 'locally'} and remain read-only in viewers`, {
    skip: !executablePath ? 'Requires Chrome.' : false,
    timeout: 60_000,
  }, async (t) => {
    let fixture = await assetProxyFixture(t);
    let browser = await puppeteer.launch({
      executablePath,
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
    /** @param {import('puppeteer-core').Page} target */
    async function interceptExternal(target) {
      await target.setRequestInterception(true);
      target.on('request', (request) => {
        let url = new URL(request.url());
        if (url.hostname !== 'assets.test') { void request.continue(); return; }
        let asset = fixture.asset(url.pathname);
        // The fixture deliberately omits CORS permission on the external source.
        void request.respond({
          status: 200,
          contentType: asset.type,
          body: asset.body,
        });
      });
    }
    await interceptExternal(page);
    await page.goto(publicPage ? fixture.publicUrl : fixture.localUrl);
    let markdownUrl = './_proxy?url=https%3A%2F%2Fassets.test%2Fredirect.md';
    let imageUrl = './_proxy?url=https%3A%2F%2Fassets.test%2Fimage.png';
    let state = {
      inline: '# Inline fallback',
      source: markdownUrl,
      texts: {
        loading: 'Loading source',
        empty: 'No document',
        fetchFailed: 'Source request failed',
        inputTooLarge: 'Source too large',
      },
    };
    await fixture.runtime.insert(`
      <context-provider id="assets" ctx="ASSETS">
        <script type="application/json">${JSON.stringify(state)}</script>
        <agui-markdown id="remote" label="External document" bind="$.src: ASSETS/source; $.value: ASSETS/inline; $.texts: ASSETS/texts"></agui-markdown>
        <img id="asset-image" src="${imageUrl}" alt="Proxied marker">
      </context-provider>
    `);
    await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === 'Proxied notes');
    assert.equal(await page.$eval('#remote a', (element) => element.getAttribute('href')), 'https://assets.test/docs/next.md');
    assert.equal(await page.$eval('#remote img', (element) => element.getAttribute('src')), 'https://assets.test/docs/cover.png');
    assert.equal(await page.evaluate(() => Reflect.get(window, 'proxyInjected')), undefined);
    assert.equal(await page.$('#remote script'), null);
    let native = await page.evaluate(async () => {
      let directBlocked = false;
      try { await fetch('https://assets.test/records.json'); }
      catch { directBlocked = true; }
      // Ordinary URL construction works without an AGUI fetch wrapper.
      let endpoint = new URL('./_proxy', document.baseURI);
      endpoint.searchParams.set('url', 'https://assets.test/records.json');
      let records = await (await fetch(endpoint)).json();
      endpoint.searchParams.set('url', 'https://assets.test/feed.xml');
      let feed = new DOMParser().parseFromString(await (await fetch(endpoint)).text(), 'application/xml');
      let directImage = new Image();
      directImage.crossOrigin = 'anonymous';
      directImage.src = 'https://assets.test/image.png';
      let directImageBlocked = false;
      try { await directImage.decode(); }
      catch { directImageBlocked = true; }
      let image = /** @type {HTMLImageElement} */ (document.getElementById('asset-image'));
      await image.decode();
      let canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      let context = canvas.getContext('2d');
      if (!context) { throw new Error('Canvas unavailable.'); }
      context.drawImage(image, 0, 0);
      return {
        directBlocked,
        directImageBlocked,
        records,
        feed: feed.querySelector('channel > title')?.textContent,
        canvas: canvas.toDataURL().startsWith('data:image/png'),
        pixels: context.getImageData(0, 0, 1, 1).data.length,
      };
    });
    assert.equal(native.directBlocked, true);
    assert.equal(native.directImageBlocked, true);
    assert.equal(native.records.records[0].id, 'one');
    assert.equal(native.feed, 'Example feed');
    assert.equal(native.canvas, true);
    assert.equal(native.pixels, 4);
    /** @param {string} source */
    let setSource = (source) => page.$eval('#assets', (element, value) => {
      Reflect.get(element, '$').source = value;
    }, source);
    let slow = fixture.expectCancellation('/slow.md');
    await setSource('./_proxy?url=https%3A%2F%2Fassets.test%2Fslow.md');
    await withTimeout(slow.started, 5000, 'Slow source did not start.');
    await setSource('./_proxy?url=https%3A%2F%2Fassets.test%2Ffast.md');
    await withTimeout(slow.cancelled, 5000, 'Superseded source did not cancel upstream.');
    await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === 'Updated source');
    await setSource('./_proxy?url=https%3A%2F%2Fassets.test%2Flarge.md');
    await page.waitForFunction(() => document.querySelector('#remote > agui-state p')?.textContent === 'Source too large');
    await setSource('./_proxy?url=https%3A%2F%2Fblocked.test%2Fnotes.md');
    await page.waitForFunction(() => document.querySelector('#remote > agui-state p')?.textContent === 'Source request failed');
    await setSource('');
    await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === 'Inline fallback');
    assert.equal(await page.$eval('#assets', (element) => Reflect.get(element, '$').inline), '# Inline fallback');
    await setSource(markdownUrl);
    await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === 'Proxied notes');
    let viewer = await (await browser.createBrowserContext()).newPage();
    await interceptExternal(viewer);
    /** @type {string[]} */
    let viewerRequests = [];
    viewer.on('request', (request) => {
      let url = new URL(request.url());
      if (url.pathname.endsWith('/_proxy')) { viewerRequests.push(url.searchParams.get('url') || ''); }
    });
    await viewer.goto(fixture.viewerUrl);
    await viewer.waitForFunction(() => {
      let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
      let image = /** @type {HTMLImageElement | null} */ (frame?.contentDocument?.getElementById('asset-image'));
      return image?.complete && image.naturalWidth > 0 && frame?.contentDocument?.querySelector('#remote h1')?.textContent === 'Proxied notes';
    });
    assert.ok(viewerRequests.includes('https://assets.test/image.png'));
    assert.equal(viewerRequests.some((source) => source.endsWith('.md')), false);
    let frame = await (await viewer.$('#agui-viewer'))?.contentFrame();
    assert.ok(frame);
    assert.equal(await frame.evaluate(() => document.body.inert), true);
    assert.equal(await frame.$eval('#remote a', (element) => element.hasAttribute('href')), false);
    assert.equal(await frame.evaluate(() => customElements.get('agui-markdown')), undefined);
    let removed = fixture.expectCancellation('/removed.md');
    await setSource('./_proxy?url=https%3A%2F%2Fassets.test%2Fremoved.md');
    await withTimeout(removed.started, 5000, 'Removed source did not start.');
    await page.$eval('#remote', (element) => element.remove());
    await withTimeout(removed.cancelled, 5000, 'Removed widget did not cancel upstream.');
    assert.deepEqual(errors, []);
  });
}

test('the gallery proxy preset uses existing controls, stays opt-in, and disables external document wrappers', {
  skip: !executablePath ? 'Requires Chrome.' : false,
  timeout: 60_000,
}, async (t) => {
  let fixture = await assetProxyFixture(t);
  let gallery = await readFile(new URL('../../src/page/uilib-gallery.html', import.meta.url), 'utf8');
  let {
    document: galleryDocument,
  } = parseHTML('');
  let template = galleryDocument.createElement('template');
  template.innerHTML = gallery;
  let source = template.content.querySelector('#gallery-data > script[type="application/json"]')?.textContent;
  let panel = template.content.querySelector('#gallery-markdown')?.closest('agui-panel');
  assert.ok(source && panel);
  let data = JSON.parse(source);
  let state = {
    markdownSource: data.markdownSource,
    markdownUrl: data.markdownUrl,
    markdownSourceOptions: data.markdownSourceOptions,
    markdownTexts: data.markdownTexts,
  };
  let preset = state.markdownSourceOptions.find((/** @type {{ value: string }} */ option) => option.value);
  assert.ok(preset);
  let endpoint = new URL(preset.value, fixture.localUrl);
  let upstream = new URL(endpoint.searchParams.get('url') || '');
  let proxy = fixture.runtime.assetProxy;
  assert.ok(proxy);
  let loads = 0;
  proxy.open = async ({ url }) => {
    assert.equal(url.href, upstream.href);
    loads += 1;
    return upstreamResponse('# Example README\n\n<agui-panel>\n\nReadable wrapper fallback.\n\n</agui-panel>', {
      'content-type': 'text/markdown',
    });
  };
  let browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  t.after(() => browser.close());
  let page = await browser.newPage();
  await page.goto(fixture.localUrl);
  await fixture.runtime.insert(`<context-provider ctx="APP"><script type="application/json">${JSON.stringify(state).replaceAll('<', '\\u003c')}</script>${panel.outerHTML}</context-provider>`);
  await page.waitForFunction(() => document.querySelector('#gallery-markdown h1')?.textContent === 'Project briefing');
  assert.equal(loads, 0);
  await fixture.runtime.changeProxy({
    command: 'allow',
    origin: upstream.origin,
  });
  await page.select('#gallery-markdown-preset select', preset.value);
  await page.waitForFunction(() => document.querySelector('#gallery-markdown h1')?.textContent === 'Example README');
  assert.equal(await page.$eval('#gallery-markdown-url input', (element) => element.value), preset.value);
  assert.equal(await page.$eval('#gallery-markdown', (element) => Reflect.get(element, '$').extensions), false);
  assert.equal(await page.$('#gallery-markdown agui-panel'), null);
  assert.equal(loads, 1);
  await page.select('#gallery-markdown-preset select', '');
  await page.waitForFunction(() => document.querySelector('#gallery-markdown h1')?.textContent === 'Project briefing');
  assert.equal(await page.$eval('#gallery-markdown', (element) => Reflect.get(element, '$').extensions), true);
});
