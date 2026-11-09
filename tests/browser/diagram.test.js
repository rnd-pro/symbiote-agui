import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import puppeteer from 'puppeteer';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { temporaryState } from '../node/state-fixture.js';
import { DIAGRAM_RUNTIME_PATH, DIAGRAM_LIMITS } from '../../src/uilib/widgets/diagram/constants.js';
import { CLIENT_SCRIPT_PATH } from '../../src/markup/constants.js';

test('diagrams load once on initialization, use latest source, reject unsafe content, and mirror without an engine', {
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let runtime = new SessionRuntime({
    sessionId: 'diagrams',
    instanceId: randomUUID(),
    controlToken: '',
    pid: process.pid,
    launcherPid: process.pid,
  });
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await runtime.close();
    await state.close();
  });
  await runtime.start(new AbortController().signal);
  await runtime.insert('<agui-panel>No diagram here.</agui-panel>');
  assert.ok(runtime.record.url && runtime.access && runtime.pages);
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  page.setDefaultTimeout(8_000);
  /** @type {string[]} */
  let errors = [];
  /** @type {string[]} */
  let external = [];
  let runtimeRequests = 0;
  /** @type {(request: import('puppeteer').HTTPRequest) => void} */
  let requested = () => {};
  let waitingRequest = new Promise((/** @type {(request: import('puppeteer').HTTPRequest) => void} */ resolve) => { requested = resolve; });
  /** @type {Promise<string> | undefined} */
  let clientSource;
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('response', (response) => {
    if (new URL(response.url()).pathname === CLIENT_SCRIPT_PATH) { clientSource = response.text(); }
  });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    let url = new URL(request.url());
    if (url.pathname === DIAGRAM_RUNTIME_PATH) { runtimeRequests += 1; requested(request); }
    else if (url.hostname === 'example.test') { external.push(url.href); void request.abort(); }
    else { void request.continue(); }
  });
  await page.goto(runtime.record.url);
  await page.waitForSelector('agui-panel');
  assert.equal(runtimeRequests, 0);
  assert.doesNotMatch(await clientSource || '', /unsupported-diagram/);
  await runtime.insert(`
    <context-provider ctx="DIAGRAMS">
      <script type="application/json">{
        "source":"flowchart LR; Old --> Output",
        "texts":{"source":"Source","loading":"Loading diagram","empty":"No source","invalidValue":"Text required","invalidSource":"Syntax error","unsupported":"Unsupported diagram","inputTooLarge":"Source too large","outputTooLarge":"Output too large","limitExceeded":"Rendering limit","loadFailed":"Load failed","renderFailed":"Render failed"}
      }</script>
      <agui-diagram label="Workflow" bind="$.value: DIAGRAMS/source; $.texts: DIAGRAMS/texts"></agui-diagram>
      <agui-diagram label="Second workflow" bind="$.value: DIAGRAMS/source; $.texts: DIAGRAMS/texts"></agui-diagram>
      <agui-diagram label="Transient workflow" bind="$.value: DIAGRAMS/source; $.texts: DIAGRAMS/texts"></agui-diagram>
    </context-provider>
  `);
  let request = await waitingRequest;
  await page.$eval('agui-diagram[label="Transient workflow"]', (element) => {
    Reflect.set(window, 'removedDiagram', element);
    element.remove();
  });
  await page.$eval('context-provider', (element) => { Reflect.get(element, '$').source = 'flowchart LR; Latest --> Result'; });
  await request.continue();
  await page.waitForFunction(() => document.querySelectorAll('agui-diagram svg').length === 2);
  assert.equal(runtimeRequests, 1);
  await page.waitForFunction(() => Reflect.get(window, 'removedDiagram').disposed);
  assert.match(await page.$eval('agui-diagram svg', (element) => element.textContent || ''), /Latest/);
  let response = await request.response();
  assert.ok(response);
  assert.equal(response.ok(), true);
  let bundle = await response.text();
  t.diagnostic(`Lazy diagram runtime: ${Buffer.byteLength(bundle)} bytes, ${gzipSync(bundle).byteLength} bytes gzip.`);

  await page.$eval('context-provider', (element) => {
    Reflect.get(element, '$').source = 'flowchart LR\n A["<img src=https://example.test/image onerror=alert(1)> {{DIAGRAMS/secret}}"] --> B[Output]\n click B "https://example.test/"';
  });
  await page.waitForFunction(() => document.querySelector('agui-diagram svg')?.textContent?.includes('DIAGRAMS/secret'));
  assert.equal(await page.$('agui-diagram svg script, agui-diagram svg image, agui-diagram svg foreignObject, agui-diagram svg a'), null);
  assert.deepEqual(external, []);
  await page.$eval('context-provider', (element) => { Reflect.get(element, '$').source = 'flowchart LR\n A['; });
  await page.waitForFunction(() => document.querySelector('agui-diagram agui-state')?.textContent?.includes('Syntax error'));
  assert.equal(await page.$('agui-diagram svg'), null);
  await page.$eval('context-provider', (element, limit) => { Reflect.get(element, '$').source = 'x'.repeat(limit + 1); }, DIAGRAM_LIMITS.inputBytes);
  await page.waitForFunction(() => document.querySelector('agui-diagram agui-state')?.textContent?.includes('Source too large'));
  assert.equal(await page.$eval('agui-diagram code', (element) => element.textContent), '');
  await page.$eval('context-provider', (element) => { Reflect.get(element, '$').source = 'sequenceDiagram\n User->>App: Final message'; });
  await page.waitForFunction(() => document.querySelector('agui-diagram svg')?.textContent?.includes('Final message'));
  let ids = await page.$$eval('agui-diagram svg [id]', (elements) => elements.map((element) => element.id));
  assert.equal(new Set(ids).size, ids.length);

  runtime.access.sharing = true;
  runtime.pages.shared.enable(runtime.latest?.revision ?? 0);
  let viewer = await browser.newPage();
  let viewerLoads = 0;
  viewer.on('request', (request) => { if (new URL(request.url()).pathname === DIAGRAM_RUNTIME_PATH) { viewerLoads += 1; } });
  await viewer.goto(`${runtime.record.url}?mode=viewer`);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('agui-diagram svg')?.textContent?.includes('Final message');
  });
  assert.equal(viewerLoads, 0);
  assert.deepEqual(errors, []);
});
