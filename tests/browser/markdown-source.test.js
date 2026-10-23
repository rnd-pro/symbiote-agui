import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { MARKDOWN_LIMITS } from '../../src/page/client/uilib/widgets/markdown/constants.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('Markdown src loads bounded CORS documents, cancels superseded loads, preserves inline state, and stays inactive in viewers', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'markdown-source').catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'markdown-source', '--no-open');
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  /** @type {import('puppeteer-core').HTTPRequest[]} */
  let requests = [];
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    let url = new URL(request.url());
    if (!url.pathname.endsWith('.md')) { request.continue(); return; }
    requests.push(request);
    if (url.pathname === '/slow.md') { return; }
    if (url.pathname === '/redirect.md') {
      request.respond({
        status: 302,
        headers: {
          Location: 'https://example.test/docs/redirected.md',
          'Access-Control-Allow-Origin': '*',
        },
      });
      return;
    }
    request.respond({
      status: url.pathname === '/failed.md' ? 503 : 200,
      contentType: 'text/markdown; charset=utf-8',
      headers: url.pathname === '/no-cors.md' ? {} : {
        'Access-Control-Allow-Origin': '*',
      },
      body: url.pathname === '/large.md' ? 'x'.repeat(MARKDOWN_LIMITS.inputBytes + 1)
        : `# ${url.pathname}\n\n[Relative document](next.md)\n\n\`\`\`js\nconst message = "Loaded";\n\`\`\``,
    });
  });
  await page.goto(session.url);
  await insertStdin('markdown-source', `
    <context-provider id="source-data" ctx="SOURCE">
      <script type="application/json">
        {"inline":"# Inline","url":"","texts":{"loading":"Loading source","empty":"No document","loadFailed":"Dependency failed","renderFailed":"Render failed","invalidValue":"Invalid text","inputTooLarge":"Source too large","outputTooLarge":"Output too large","invalidSrc":"Invalid URL","fetchFailed":"Source request failed"}}
      </script>
      <agui-markdown id="remote" src="https://example.test/first.md" label="External document" bind="$.value: SOURCE/inline; $.texts: SOURCE/texts"></agui-markdown>
      <agui-markdown id="bound" label="Bound source" bind="$.src: SOURCE/url; $.value: SOURCE/inline; $.texts: SOURCE/texts"></agui-markdown>
    </context-provider>
  `);
  await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === '/first.md');
  assert.equal(await page.$eval('#bound h1', (element) => element.textContent), 'Inline');
  assert.ok(await page.$('#remote code .hljs-keyword'));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers().referer || '', '');
  assert.equal(requests[0].headers().cookie || '', '');
  await page.$eval('#remote', (element) => element.setAttribute('label', 'Updated label'));
  await page.waitForFunction(() => document.querySelector('#remote article')?.getAttribute('aria-label') === 'Updated label');
  assert.equal(requests.length, 1);
  /** @param {string} src */
  let setSrc = (src) => page.$eval('#remote', (element, src) => element.setAttribute('src', src), src);
  await setSrc('https://example.test/slow.md');
  await page.waitForFunction(() => document.querySelector('#remote > p')?.textContent === 'Loading source');
  await page.$eval('#remote', (element) => Reflect.set(window, 'oldSource', Reflect.get(element, 'sourceController')));
  await setSrc('https://example.test/fast.md');
  await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === '/fast.md');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'oldSource').signal.aborted), true);
  let count = requests.length;
  await setSrc('data:text/markdown,Forbidden');
  await page.waitForFunction(() => document.querySelector('#remote > p')?.textContent === 'Invalid URL');
  assert.equal(requests.length, count);
  for (let path of [
    'failed',
    'no-cors',
  ]) {
    await setSrc(`https://example.test/${path}.md`);
    await page.waitForFunction(() => document.querySelector('#remote > p')?.textContent === 'Source request failed');
  }
  await setSrc('https://example.test/large.md');
  await page.waitForFunction(() => document.querySelector('#remote > p')?.textContent === 'Source too large');
  await setSrc('relative.md');
  await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === '/markdown-source/relative.md');
  await setSrc('https://example.test/redirect.md');
  await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === '/docs/redirected.md');
  assert.equal(await page.$eval('#remote a', (element) => element.getAttribute('href')), 'https://example.test/docs/next.md');
  await page.$eval('#remote', (element) => element.removeAttribute('src'));
  await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === 'Inline');
  assert.equal(await page.$eval('#source-data', (element) => Reflect.get(element, '$').inline), '# Inline');
  await sendStdin('update', 'markdown-source', JSON.stringify({
    selector: '#source-data',
    values: {
      url: 'https://example.test/bound.md',
    },
  }));
  await page.waitForFunction(() => document.querySelector('#bound h1')?.textContent === '/bound.md');
  await setSrc('https://example.test/final.md');
  await page.waitForFunction(() => document.querySelector('#remote h1')?.textContent === '/final.md');
  await sendStdin('update', 'markdown-source', JSON.stringify({
    selector: '#source-data',
    values: {
      url: 'https://example.test/slow.md',
    },
  }));
  await page.$eval('#bound', (element) => {
    Reflect.set(window, 'removedSource', Reflect.get(element, 'sourceController'));
    element.remove();
  });
  assert.equal(await page.evaluate(() => Reflect.get(window, 'removedSource').signal.aborted), true);
  await cli('share', 'markdown-source');
  let viewer = await browser.newPage();
  let viewerSources = 0;
  viewer.on('request', (request) => { if (new URL(request.url()).pathname.endsWith('.md')) { viewerSources += 1; } });
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#remote .hljs-keyword');
  });
  assert.equal(viewerSources, 0);
  assert.deepEqual(errors, []);
});
