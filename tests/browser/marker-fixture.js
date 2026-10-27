import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { temporaryState } from '../node/state-fixture.js';

/** @param {import('node:test').TestContext} t */
export async function markerFixture(t) {
  let state = await temporaryState();
  let runtime = new SessionRuntime({
    sessionId: 'viewer-markers',
    instanceId: randomUUID(),
    controlToken: '',
    pid: process.pid,
    launcherPid: process.pid,
  });
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => { await browser?.close(); await runtime.close(); await state.close(); });
  let saved = await prepareCachedMarkup('viewer-markers', await readFile(new URL('./viewer-markers.html', import.meta.url), 'utf8'));
  try { await saved.commit(); } finally { await saved.discard(); }
  await runtime.start(new AbortController().signal);
  assert.ok(runtime.access && runtime.pages && runtime.record.url);
  runtime.access.sharing = true;
  runtime.pages.shared.enable(runtime.latest?.revision ?? 0);
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  return {
    runtime,
    browser,
    url: runtime.record.url,
    pages: runtime.pages,
  };
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} selector
 */
export async function hoverMirror(page, selector) {
  await page.bringToFront();
  let point = await page.evaluate((selector) => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    let element = frame.contentDocument?.querySelector(selector);
    if (!element) { throw new Error(`Missing mirror target ${selector}`); }
    let box = element.getBoundingClientRect();
    let outer = frame.getBoundingClientRect();
    return {
      x: outer.left + box.left + box.width / 2,
      y: outer.top + box.top + box.height / 2,
      anchor: element.getAttribute('data-agui-anchor'),
    };
  }, selector);
  await page.mouse.move(point.x, point.y);
  return point;
}
