import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { readRuntimeCache, runtimeCachePath } from '../../src/data/cache.js';
import { temporaryState } from '../node/state-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('declarative data toolbar saves, cancels, imports offline, delivers one bounded reference, and keeps viewer status local', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.', timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let runtime = new SessionRuntime({ sessionId: 'toolbar-test', instanceId: randomUUID(), controlToken: '', pid: process.pid, launcherPid: process.pid });
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  let release = () => {};
  t.after(async () => { release(); await browser?.close(); await runtime.close(); await state.close(); });
  let saved = await prepareCachedMarkup('toolbar-test', await readFile(new URL('./data-toolbar.html', import.meta.url), 'utf8'));
  try { await saved.commit(); } finally { await saved.discard(); }
  await runtime.start(new AbortController().signal);
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10_000, protocolTimeout: 10_000 });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  assert.ok(runtime.record.url);
  await page.goto(runtime.record.url);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.connectionLabel === 'Connected');
  await page.type('#name input', 'First');
  await page.type('#email input', 'bad-address');
  await page.click('#data button');
  assert.equal(await readRuntimeCache('toolbar-test'), undefined);
  await page.$eval('#email input', (element) => { Reflect.set(element, 'value', ''); element.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#data button');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.delivery?.failure?.code === 'DISABLED');
  assert.match((await readRuntimeCache('toolbar-test'))?.html || '', /"name":"First"/);
  await page.type('#name input', ' draft');
  await page.click('#data button:nth-child(2)');
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'First');

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.connectionLabel === 'Disconnected');
  let file = join(state.directory, 'draft.json');
  await writeFile(file, JSON.stringify({ version: 1, changes: [{ provider: 'APP', values: { name: 'Imported', email: '' } }] }));
  let input = await page.$('input[type=file]');
  assert.ok(input);
  await input.uploadFile(file);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.dirty === true);
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'Imported');
  assert.match((await readRuntimeCache('toolbar-test'))?.html || '', /"name":"First"/);
  await page.click('#data button:nth-child(4)');
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, 'transferState').state), 'download-started');
  await page.click('#data button:nth-child(2)');
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'First');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.connectionLabel === 'Connected');

  let log = join(state.directory, 'feedback.jsonl');
  await runtime.feedback.configure({ ...runtime.feedback.identity, conversationId: 'toolbar-fixture', command: {
    executable: process.execPath, args: [fileURLToPath(new URL('../node/feedback-fixture.js', import.meta.url)), 'record', log], input: { channel: 'stdin' },
  } });
  await page.type('#name input', ' Second');
  let gate = runtime.enqueue(() => new Promise((resolve) => { release = () => resolve(undefined); }));
  await new Promise((resolve) => setImmediate(resolve));
  await page.click('#data button');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.result === undefined);
  await page.type('#name input', ' newer draft');
  release();
  await gate;
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.delivery?.state === 'accepted');
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, '$').dirty), true);
  let envelope = JSON.parse((await readFile(log, 'utf8')).trim());
  assert.equal(envelope.event.type, 'agui.data.submitted');
  assert.deepEqual(Object.keys(envelope.event.data).sort(), ['commit', 'targets']);
  let reference = envelope.event.data.commit;
  /**
   * @param {string} suffix
   * @param {Record<string, unknown>} input
   */
  async function call(suffix, input) {
    let discovery = (await runtime.tools({ action: 'tools' })).toolResponse;
    assert.ok(discovery?.action === 'tools');
    let tool = discovery.tools.find((tool) => tool.name.includes(suffix));
    assert.ok(tool, `${suffix}: ${discovery.tools.map((tool) => tool.name).join(', ')}`);
    let result = (await runtime.tools({ action: 'call', pageId: discovery.pageId, discoveryId: discovery.discoveryId, name: tool.name, input })).toolResponse;
    assert.ok(result?.action === 'call');
    return result.result;
  }
  let snapshot = await call('read_saved_data', { ...reference, provider: 'APP', key: 'name', limit: 100 });
  assert.match(JSON.stringify(snapshot), /First Second/);
  assert.doesNotMatch(JSON.stringify(snapshot), /newer draft/);
  await call('acknowledge_submission', { ...reference, revision: randomUUID(), state: 'verified' });
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, 'submission').external), undefined);
  await call('acknowledge_submission', { ...reference, state: 'verified' });
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, '$').dirty), true);
  assert.match(await page.$eval('#data', (element) => element.textContent || ''), /External write verified/);
  assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1);
  let cached = await readRuntimeCache('toolbar-test');
  assert.ok(cached);
  await writeFile(runtimeCachePath('toolbar-test'), cached.raw + '\n');
  await page.click('#data button');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.result?.failure?.code === 'CACHE_FAILED');
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, '$').dirty), true);
  assert.match(await page.$eval('#name input', (element) => String(Reflect.get(element, 'value'))), /newer draft/);
  assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1);
  await call('acknowledge_submission', { ...reference, state: 'verified' });
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, 'submission').external), undefined);
  await writeFile(runtimeCachePath('toolbar-test'), cached.raw);

  assert.ok(runtime.access && runtime.pages);
  runtime.access.sharing = true;
  runtime.pages.shared.enable(runtime.latest?.revision ?? 0);
  let viewer = await browser.newPage();
  viewer.on('pageerror', (error) => errors.push(String(error)));
  await viewer.goto(runtime.record.url + '?mode=viewer');
  await viewer.waitForFunction(() => document.querySelector('agui-data-toolbar')?.textContent?.includes('Viewer'));
  assert.match(await viewer.$eval('agui-data-toolbar', (element) => element.textContent || ''), /Connected/);
  assert.equal(await viewer.$$eval('agui-data-toolbar button:not([hidden])', (buttons) => buttons.every((button) => Reflect.get(button, 'disabled'))), true);
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.querySelector('iframe'));
    return frame?.contentDocument?.querySelectorAll('agui-data-toolbar').length;
  }), 0);
  await viewer.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.match(await viewer.$eval('agui-data-toolbar', (element) => element.textContent || ''), /Disconnected/);
  assert.deepEqual(errors, []);
});
