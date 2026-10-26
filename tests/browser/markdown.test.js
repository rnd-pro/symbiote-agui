import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { MARKDOWN_RUNTIME_PATH, MARKDOWN_SANITIZER_PATH, MARKDOWN_LIMITS } from '../../src/page/client/uilib/widgets/markdown/constants.js';
import { CLIENT_SCRIPT_PATH } from '../../src/markup/constants.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('Markdown loads on demand, sanitizes with native/fallback paths, bounds output, ignores stale work, and mirrors without a runtime', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'markdown').catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'markdown', '--no-open');
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Reflect.deleteProperty(Element.prototype, 'setHTML');
    Reflect.set(window, 'markdownProbeCount', 0);
    customElements.define('x-markdown-probe', class extends HTMLElement {
      static observedAttributes = [
        'label',
      ];
      constructor() { super(); Reflect.set(window, 'markdownProbeCount', Reflect.get(window, 'markdownProbeCount') + 1); }
      connectedCallback() {
        let source = this.querySelector('code.language-json')?.textContent;
        if (source) { this.setAttribute('data-config-label', JSON.parse(source).label); }
      }
    });
  });
  /** @type {string[]} */
  let errors = [];
  /** @type {import('puppeteer-core').HTTPRequest[]} */
  let runtimeRequests = [];
  /** @type {import('puppeteer-core').HTTPRequest[]} */
  let sanitizerRequests = [];
  /** @type {string[]} */
  let externalRequests = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    let url = new URL(request.url());
    if (url.pathname === MARKDOWN_RUNTIME_PATH) { runtimeRequests.push(request); }
    else if (url.pathname === MARKDOWN_SANITIZER_PATH) { sanitizerRequests.push(request); }
    else if (url.hostname === 'example.test') { externalRequests.push(url.href); request.abort(); }
    else { request.continue(); }
  });
  let mainResponse = page.waitForResponse((response) => new URL(response.url()).pathname === CLIENT_SCRIPT_PATH);
  await page.goto(session.url);
  assert.equal((await (await mainResponse).text()).includes('marked(): input parameter is undefined or null'), false);
  assert.equal(runtimeRequests.length, 0);
  assert.equal(sanitizerRequests.length, 0);
  await insertStdin('markdown', await readFile(new URL('./markdown.html', import.meta.url), 'utf8'));
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Loading document');
  /** @param {unknown} source */
  let update = (source) => sendStdin('update', 'markdown', JSON.stringify({
    selector: '#markdown-data',
    values: {
      source,
    },
  }));
  let source = [
    '# Release notes',
    '[Jump](#details)',
    '## Details',
    '**Bold** and *italic* with ~~removed~~ text.',
    '> A quote',
    '1. First\n2. Second',
    '- [x] Ready\n- [ ] Pending',
    '| Name | Status |\n| --- | --- |\n| Example | Ready |',
    '```html\n<agui-toggle bind="$.value: DOCS/secret"></agui-toggle>\n```',
    '<script>window.markdownAttack = true</script>',
    '<x-markdown-probe label="Example wrapper" bind="textContent: DOCS/secret">\n\n### Wrapper fallback\n\n```json\n{"label":"Prepared config"}\n```\n\n</x-markdown-probe>',
    '<unknown-markdown-wrapper>\n\n### Unknown wrapper fallback\n\nReadable **content**.\n\n</unknown-markdown-wrapper>',
    '<agui-panel>\n\nLiteral {{DOCS/secret}}\n\n</agui-panel>',
    '<agui-icon name="info" aria-label="Information"></agui-icon>',
    '<details open><summary>More</summary><p>HTML disclosure</p></details>',
    '<picture><source srcset="https://example.test/one.png 1x, https://example.test/two.png 2x"><img src="https://example.test/fallback.png" alt="Responsive diagram" onerror="window.markdownAttack=true"></picture>',
    '<span onclick="window.markdownAttack = true">raw HTML</span>',
    '{{DOCS/secret}}',
    '[Website](https://example.test/docs) [Mail](mailto:team@example.test)',
    '[Bad](javascript:alert%281%29) [Encoded](javascript&#58;alert%281%29) [Data](data:text/html,evil) [Relative](/path)',
    '![Diagram](https://example.test/tracker.png)',
  ].join('\n\n');
  await update(source);
  await page.$eval('#late-document', (element) => { Reflect.set(window, 'removedDocument', element); element.remove(); });
  await page.waitForFunction(() => Reflect.get(window, 'removedDocument').allSubs.size === 0);
  assert.equal(runtimeRequests.length, 1);
  await runtimeRequests[0].continue();
  // Hold the sanitizer while a newer source supersedes the first parse.
  for (let attempt = 0; !sanitizerRequests.length && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(sanitizerRequests.length, 1);
  source += '\n\nLatest revision';
  await update(source);
  await sanitizerRequests[0].continue();
  await page.waitForFunction(() => document.querySelector('#first-document article')?.textContent?.includes('Latest revision'));
  assert.equal(await page.$('#first-document article script, #first-document article [onclick], #first-document article [onerror], #first-document x-markdown-probe[bind], #first-document article agui-toggle'), null);
  assert.ok(await page.$('#first-document details[open] summary'));
  assert.ok(await page.$('#first-document picture source[srcset]'));
  assert.equal(await page.$eval('#first-document x-markdown-probe', (element) => element.getAttribute('data-config-label')), 'Prepared config');
  assert.equal(await page.$eval('#first-document x-markdown-probe', (element) => element.getAttribute('label')), 'Example wrapper');
  assert.equal(await page.$eval('#first-document unknown-markdown-wrapper h3', (element) => element.textContent), 'Unknown wrapper fallback');
  await page.waitForFunction(() => !!document.querySelector('#first-document agui-icon')?.textContent?.trim());
  assert.ok(await page.$('#first-document pre code .hljs-tag'));
  assert.ok(await page.evaluate(() => Reflect.get(window, 'markdownProbeCount')) > 0);
  assert.equal(await page.evaluate(() => Reflect.get(window, 'markdownAttack')), undefined);
  assert.equal(await page.$eval('#first-document article', (element) => element.textContent?.includes('Private provider value')), false);
  assert.equal(await page.$eval('#first-document article', (element) => element.textContent?.includes('{{DOCS/secret}}')), true);
  assert.equal(await page.$eval('#first-document code.language-html', (element) => element.textContent), '<agui-toggle bind="$.value: DOCS/secret"></agui-toggle>\n');
  assert.equal(await page.$eval('#first-document .agui-markdown-table table td', (element) => element.textContent), 'Example');
  assert.equal(await page.$$eval('#first-document input', (inputs) => inputs.length === 2 && inputs.every((input) => input.disabled)), true);
  assert.deepEqual(await page.$$eval('#first-document input', (inputs) => inputs.map((input) => input.checked)), [
    true,
    false,
  ]);
  let anchors = await page.$$eval('#first-document a', (links) => links.map((link) => ({
    text: link.textContent,
    href: link.getAttribute('href'),
    target: link.target,
    rel: link.rel,
  })));
  assert.ok(anchors.find((link) => link.text === 'Jump')?.href?.startsWith('#agui-md-'));
  assert.equal(anchors.find((link) => link.text === 'Website')?.target, '_blank');
  assert.equal(anchors.find((link) => link.text === 'Website')?.rel, 'noopener noreferrer');
  for (let text of [
    'Bad',
    'Encoded',
    'Data',
  ]) { assert.equal(anchors.find((link) => link.text === text)?.href, null); }
  assert.equal(anchors.find((link) => link.text === 'Relative')?.href, new URL('/path', session.url).href);
  let firstHeading = await page.$eval('#first-document h1', (element) => element.id);
  assert.notEqual(await page.$eval('#second-document h1', (element) => element.id), firstHeading);
  assert.equal(await page.evaluate(() => Reflect.get(window, 'removedDocument').ref.body.childNodes.length), 0);
  assert.equal((await cli('events', 'markdown')).events.length, 0);
  assert.ok(externalRequests.length);
  assert.ok(externalRequests.every((url) => url.endsWith('.png')));
  await update('x'.repeat(MARKDOWN_LIMITS.inputBytes + 1));
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Document source is too large');
  assert.equal(await page.$eval('#first-document article', (element) => element.childNodes.length), 0);
  await update('&'.repeat(MARKDOWN_LIMITS.inputBytes));
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Rendered document is too large');
  await update('**x** '.repeat(2000));
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Rendered document is too large');
  await update(`${'> '.repeat(MARKDOWN_LIMITS.depth + 1)}Nested document`);
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Rendered document is too large');
  await update(null);
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Document must be text');
  await update('');
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'No document');
  await page.$eval('#first-document', (element) => element.setAttribute('loading', ''));
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Loading document');
  await page.$eval('#first-document', (element) => element.setAttribute('error', 'Source request failed'));
  await page.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Source request failed');
  await page.$eval('#first-document', (element) => { element.removeAttribute('loading'); element.removeAttribute('error'); });
  await update(source);
  await page.waitForSelector('#first-document h1');
  let native = await browser.newPage();
  await native.setRequestInterception(true);
  native.on('request', (request) => new URL(request.url()).hostname === 'example.test' ? request.abort() : request.continue());
  let nativeSanitizerRequests = 0;
  native.on('request', (request) => { if (new URL(request.url()).pathname === MARKDOWN_SANITIZER_PATH) { nativeSanitizerRequests += 1; } });
  await native.goto(session.url);
  await native.waitForSelector('#markdown-data');
  await native.$eval('#markdown-data', (element, source) => { Reflect.get(element, '$').source = source; }, source);
  await native.waitForFunction(() => document.querySelector('#first-document article')?.textContent?.includes('Latest revision'));
  if (await native.evaluate(() => 'setHTML' in Element.prototype)) {
    assert.equal(nativeSanitizerRequests, 0);
    assert.equal(await native.$('#first-document article script, #first-document article [onclick], #first-document x-markdown-probe[bind]'), null);
    assert.ok(await native.$('#first-document unknown-markdown-wrapper h3'));
    assert.equal(await native.$$eval('#first-document input', (inputs) => inputs.length === 2 && inputs.every((input) => input.disabled)), true);
    assert.ok(await native.$('#first-document pre code .hljs-tag'));
  }
  await native.close();
  for (let path of [
    MARKDOWN_RUNTIME_PATH,
    MARKDOWN_SANITIZER_PATH,
  ]) {
    let failure = await browser.newPage();
    await failure.evaluateOnNewDocument(() => { Reflect.deleteProperty(Element.prototype, 'setHTML'); });
    await failure.setRequestInterception(true);
    failure.on('request', (request) => new URL(request.url()).pathname === path ? request.abort() : request.continue());
    await failure.goto(session.url);
    await failure.waitForFunction(() => document.querySelector('#first-document > agui-state p')?.textContent === 'Document dependency failed');
    await failure.close();
  }
  await cli('share', 'markdown');
  let viewer = await browser.newPage();
  let viewerDependencies = 0;
  viewer.on('request', (request) => {
    if ([
      MARKDOWN_RUNTIME_PATH,
      MARKDOWN_SANITIZER_PATH,
    ].includes(new URL(request.url()).pathname)) { viewerDependencies += 1; }
  });
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#first-document h1');
  });
  assert.equal(viewerDependencies, 0);
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert && !frame.contentDocument.querySelector('#first-document a[href]') && !frame.contentWindow?.customElements.get('agui-markdown');
  }), true);
  await page.bringToFront();
  await page.$eval('#first-document', (element) => { Reflect.set(window, 'oldDocument', element); });
  await insertStdin('markdown', '<p>Replaced</p>');
  await page.waitForFunction(() => Reflect.get(window, 'oldDocument').allSubs.size === 0 && Reflect.get(window, 'oldDocument').disposed);
  assert.deepEqual(errors, []);
});
