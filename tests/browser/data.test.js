import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup, readCachedMarkup } from '../../src/sessions/cache.js';
import { readRuntimeCache } from '../../src/data/cache.js';
import { temporaryState } from '../node/state-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

function makeRuntime() {
  return new SessionRuntime({ sessionId: 'data-browser', instanceId: randomUUID(), controlToken: '', pid: process.pid, launcherPid: process.pid });
}

test('Save restores committed values, retains newer drafts, rejects stale tabs, and recovers receipts without replay', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.', timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let runtime = makeRuntime();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  let release = () => {};
  t.after(async () => { release(); await browser?.close(); await runtime.close(); await state.close(); });
  let html = await readFile(new URL('./data.html', import.meta.url), 'utf8');
  let saved = await prepareCachedMarkup('data-browser', html);
  try { await saved.commit(); } finally { await saved.discard(); }
  await runtime.start(new AbortController().signal);
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10_000, protocolTimeout: 10_000 });
  let page = await browser.newPage();
  let other = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  assert.ok(runtime.record.url);
  for (let tab of [page, other]) {
    await tab.goto(runtime.record.url);
    await tab.waitForFunction(() => Reflect.get(window, 'dataTest')?.getDataState().connected);
    assert.equal(await tab.evaluate(() => Reflect.get(window, 'restoreAttempt')?.failure?.code), 'PAGE_BUSY');
  }
  await page.bringToFront();
  await page.type('#name input', 'Saved');
  let gate = runtime.enqueue(() => new Promise((resolve) => { release = () => resolve(undefined); }));
  await new Promise((resolve) => setImmediate(resolve));
  await page.click('#save');
  await page.waitForFunction(() => Reflect.get(window, 'dataTest').getDataState().pending === 1);
  await page.type('#name input', ' later draft');
  release();
  await gate;
  await page.waitForFunction(() => Reflect.get(window, 'saveResult')?.state === 'committed');
  let first = await page.evaluate(() => Reflect.get(window, 'saveResult'));
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'Saved later draft');
  assert.match((await readRuntimeCache('data-browser'))?.html || '', /"name":"Saved"/);
  assert.equal(await readCachedMarkup('data-browser'), html);
  await other.bringToFront();
  await other.waitForFunction(() => Reflect.get(window, 'dataTest').getDataState().stale);
  await other.type('#name input', 'Stale');
  await other.click('#save');
  await other.waitForFunction(() => Reflect.get(window, 'saveResult')?.failure?.code === 'STALE_DATA');
  await page.bringToFront();

  // A new connection restores only committed values; receipt reads never submit again.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction(() => Reflect.get(window, 'dataTest').getDataState().connected);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#name input') || {}, 'value') === 'Saved');
  let recovered = await page.evaluate((result) => Reflect.get(window, 'dataTest').readDataCommit({
    commitId: result.commitId, instanceId: result.instanceId, markupRevision: result.markupRevision,
  }), first);
  assert.deepEqual(recovered, first);
  assert.equal(runtime.data.receipts.size, 1);
  await page.type('#name input', ' again');
  gate = runtime.enqueue(() => new Promise((resolve) => { release = () => resolve(undefined); }));
  await new Promise((resolve) => setImmediate(resolve));
  await page.click('#save');
  await page.waitForFunction(() => Reflect.get(window, 'dataTest').getDataState().result?.state === 'queued');
  let uncertain = await page.evaluate(() => Reflect.get(window, 'dataTest').getDataState().result);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.waitForFunction(() => Reflect.get(window, 'dataTest').getDataState().result?.state === 'unknown');
  release();
  await gate;
  await runtime.updates;
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction((id) => {
    let result = Reflect.get(window, 'dataTest').getDataState().result;
    return result?.commitId === id && result.state === 'committed';
  }, {}, uncertain.commitId);
  let second = await page.evaluate(() => Reflect.get(window, 'dataTest').getDataState().result);
  assert.equal(runtime.data.receipts.size, 2);
  await page.reload();
  await page.waitForFunction(() => Reflect.get(window, 'dataTest')?.getDataState().connected);
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'Saved again');

  await runtime.close();
  runtime = makeRuntime();
  await runtime.start(new AbortController().signal);
  assert.ok(runtime.record.url);
  await page.goto(runtime.record.url);
  await page.waitForFunction(() => Reflect.get(window, 'dataTest')?.getDataState().connected);
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'Saved again');
  assert.equal(runtime.data.status().revision, second.revision);
  assert.deepEqual(errors, []);
});
