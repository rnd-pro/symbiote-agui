import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsBuild } from 'jsda-kit/server/build-asset.js';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { waitForServer, closeServer } from '../../src/shared/server.js';
import { DATA_LIMITS } from '../../src/data/constants.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('manual JSON transfer works offline, replaces only validated drafts, resets the picker, and releases downloads', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.', timeout: 30_000,
}, async (t) => {
  let state = await temporaryState();
  let bundle = await jsBuild(fileURLToPath(new URL('./data-transfer.fixture.js', import.meta.url)));
  let server = createServer((request, response) => {
    if (request.url === '/fixture.js') { response.writeHead(200, { 'content-type': 'text/javascript' }).end(bundle); return; }
    response.writeHead(200, { 'content-type': 'text/html' }).end('<input id="file" type="file"><button id="import">Import</button><button id="export">Export</button><output></output><script type="module" src="/fixture.js"></script>');
  });
  server.listen(0, '127.0.0.1');
  let origin = await waitForServer(server);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => { await browser?.close(); await closeServer(server); await state.close(); });
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10_000, protocolTimeout: 10_000 });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(origin);
  await page.waitForFunction(() => !!Reflect.get(window, 'transferTest'));
  let input = await page.$('input#file');
  assert.ok(input);
  let valid = join(state.directory, 'input.json');
  let data = { version: 1, changes: [
    { provider: 'APP', values: { records: [{ name: '</script> {{literal}} Ж' }], count: 4 } },
    { provider: 'OTHER', values: { enabled: true } },
  ] };
  await writeFile(valid, JSON.stringify(data));
  await input.uploadFile(valid);
  await page.waitForFunction(() => Reflect.get(window, 'transferTest').states.at(-1)?.state === 'imported');
  assert.deepEqual(await page.evaluate(() => {
    let fixture = Reflect.get(window, 'transferTest');
    return { records: fixture.context.read('records'), count: fixture.context.read('count'), filter: fixture.context.read('filter'), suppressed: fixture.suppressed,
      source: fixture.states.at(-1).endpoint.reference, picker: Reflect.get(document.querySelector('input') || {}, 'value') };
  }), { records: data.changes[0].values.records, count: 4, filter: 'keep', suppressed: [true], source: 'input.json', picker: '' });

  await input.uploadFile(valid);
  await page.waitForFunction(() => Reflect.get(window, 'transferTest').suppressed.length === 2);
  for (let content of ['{broken', JSON.stringify({ version: 1, changes: [{ provider: 'APP', values: { records: [], count: 5 } }] }), ' '.repeat(DATA_LIMITS.bytes + 1)]) {
    await writeFile(valid, content);
    await input.uploadFile(valid);
    await page.waitForFunction(() => Reflect.get(window, 'transferTest').states.at(-1)?.state === 'error');
    assert.equal(await page.evaluate(() => Reflect.get(window, 'transferTest').context.read('count')), 4);
  }
  await page.$eval('input', (element) => element.dispatchEvent(new Event('cancel')));
  assert.equal(await page.evaluate(() => Reflect.get(window, 'transferTest').states.at(-1).state), 'cancelled');

  // Download the current unsaved draft and import that same portable document again.
  await page.evaluate(() => Reflect.get(window, 'transferTest').context.pub('count', 9));
  let downloads = join(state.directory, 'downloads');
  await mkdir(downloads);
  let cdp = await browser.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  let downloaded = new Promise((resolve) => cdp.on('Browser.downloadProgress', (event) => { if (event.state === 'completed') { resolve(event.guid); } }));
  await page.click('#export');
  await downloaded;
  let exported = JSON.parse(await readFile(join(downloads, 'draft.json'), 'utf8'));
  assert.equal(exported.changes[0].values.count, 9);
  assert.equal(await page.evaluate(() => Reflect.get(window, 'transferTest').states.at(-1).state), 'download-started');
  assert.equal(await page.$$eval('a[download]', (elements) => elements.length), 0);
  await page.waitForFunction(() => Reflect.get(window, 'transferTest').revoked.length === 1);
  await input.uploadFile(join(downloads, 'draft.json'));
  await page.waitForFunction(() => Reflect.get(window, 'transferTest').states.at(-1)?.state === 'imported');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'transferTest').context.read('count')), 9);
  let conflict = await page.evaluate(async () => {
    let fixture = Reflect.get(window, 'transferTest');
    let source = JSON.stringify({ version: 1, changes: [
      { provider: 'APP', values: { records: [], count: 100 } }, { provider: 'OTHER', values: { enabled: false } },
    ] });
    let file = new File([source], 'slow.json');
    let release = () => {};
    let buffer = await file.arrayBuffer();
    file.arrayBuffer = () => new Promise((resolve) => { release = () => resolve(buffer); });
    let importing = fixture.transfer.importFile(file);
    fixture.PubSub.deleteCtx('APP');
    let fresh = fixture.PubSub.registerCtx({ records: [], count: 12, filter: 'fresh' }, 'APP');
    release();
    let result = await importing;
    return { code: result.failure.code, count: fresh.read('count') };
  });
  assert.deepEqual(conflict, { code: 'CONTEXT_CHANGED', count: 12 });
  let disposed = await page.evaluate(async () => {
    let fixture = Reflect.get(window, 'transferTest');
    let file = new File(['{}'], 'pending.json');
    let buffer = await file.arrayBuffer();
    let release = () => {};
    file.arrayBuffer = () => new Promise((resolve) => { release = () => resolve(buffer); });
    let importing = fixture.transfer.importFile(file);
    let before = fixture.states.length;
    fixture.transfer.dispose();
    release();
    await importing;
    document.querySelector('input')?.dispatchEvent(new Event('cancel'));
    return fixture.states.length === before;
  });
  assert.equal(disposed, true);
  assert.deepEqual(errors, []);
});
