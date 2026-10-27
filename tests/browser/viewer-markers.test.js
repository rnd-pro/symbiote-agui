import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { temporaryState } from '../node/state-fixture.js';
import { ANNOTATION_ANCHOR_ATTRIBUTE } from '../../src/transport/constants.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} selector
 */
async function hoverMirror(page, selector) {
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

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} id
 */
async function marker(page, id) {
  return page.evaluate((id) => {
    let layer = document.querySelector('agui-viewer-markers');
    let markers = /** @type {{id: string, color: string, x: number, y: number}[]} */ (Reflect.get(layer || {}, '$')?.markers || []);
    return markers.find((entry) => entry.id === id);
  }, id);
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} id
 * @param {string} selector
 */
async function waitAt(page, id, selector) {
  await page.bringToFront();
  await page.waitForFunction((id, selector) => {
    let layer = document.querySelector('agui-viewer-markers');
    let markers = /** @type {{id: string, x: number, y: number}[]} */ (Reflect.get(layer || {}, '$')?.markers || []);
    let marker = markers.find((entry) => entry.id === id);
    let box = document.querySelector(selector)?.getBoundingClientRect();
    return marker && box && Math.abs(marker.x - box.left - box.width / 2) < 1 && Math.abs(marker.y - box.top - box.height / 2) < 1;
  }, {}, id, selector);
}

test('viewer markers share content anchors across sizes and snapshots without enabling mirrored controls or capturing overlays', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45_000,
}, async (t) => {
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
    executablePath,
    headless: true,
  });
  let user = await browser.newPage();
  await user.setViewport({
    width: 1000,
    height: 850,
  });
  /** @type {string[]} */
  let errors = [];
  user.on('pageerror', (error) => { errors.push(String(error)); t.diagnostic(String(error)); });
  await user.goto(runtime.record.url);
  await user.waitForSelector('#pointer-target');
  await user.$eval('#user-action', (element) => element.addEventListener('click', () => {
    Reflect.set(window, 'markerClicks', Number(Reflect.get(window, 'markerClicks') || 0) + 1);
  }));
  let first = await browser.newPage();
  let second = await browser.newPage();
  for (let page of [
    first,
    second,
  ]) {
    page.setDefaultTimeout(6_000);
    page.on('pageerror', (error) => { errors.push(String(error)); t.diagnostic(String(error)); });
    await page.setViewport({
      width: 700,
      height: 850,
    });
    await page.goto(runtime.record.url + '?mode=viewer');
    await page.waitForFunction(() => {
      let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
      return frame?.contentDocument?.querySelector('#pointer-target[data-agui-anchor]');
    });
  }
  let target = await hoverMirror(first, '#pointer-target');
  await user.bringToFront();
  try { await user.waitForSelector('agui-viewer-markers [data-viewer]', {
    timeout: 3_000,
  }); } catch (error) {
    t.diagnostic(JSON.stringify({
      target,
      participants: Array.from(runtime.pages.shared.annotations.members.values(), (member) => member.presence),
      sequence: runtime.pages.shared.viewSequence,
      mirror: await first.evaluate(() => {
        let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
        return {
          cursor: frame.contentDocument?.documentElement.style.cursor,
          markers: document.querySelector('agui-viewer-markers')?.innerHTML,
          root: frame.getBoundingClientRect().toJSON(),
        };
      }),
    }));
    throw error;
  }
  let ids = Array.from(runtime.pages.shared.annotations.members.values(), (member) => member.presence.id);
  let firstId = ids[0];
  let secondId = ids[1];
  assert.ok(firstId && secondId);
  await user.waitForFunction((id) => document.querySelector(`[data-viewer="${id}"]`), {}, firstId);
  assert.equal(Array.from(runtime.pages.shared.annotations.members.values())[0].presence.point?.anchor, target.anchor);
  let expected = await user.$eval('#pointer-target', (element) => {
    let box = element.getBoundingClientRect();
    return {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
    };
  });
  let rendered = await marker(user, firstId);
  assert.ok(rendered);
  assert.ok(Math.abs(rendered.x - expected.x) < 1 && Math.abs(rendered.y - expected.y) < 1, 'Marker coordinates follow the same content at a different viewport width.');
  await second.bringToFront();
  await second.waitForSelector(`agui-viewer-markers [data-viewer="${firstId}"]`);
  assert.ok(await marker(second, firstId));
  await hoverMirror(second, '#notes input');
  await user.bringToFront();
  await user.waitForFunction(() => document.querySelectorAll('agui-viewer-markers [data-viewer]').length === 2);
  assert.notEqual((await marker(user, firstId))?.color, (await marker(user, secondId))?.color);
  await first.mouse.click(target.x, target.y);
  assert.equal(await first.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert;
  }), true);
  assert.equal(await user.$eval('#notes input', (element) => Reflect.get(element, 'value')), 'Preserve this value');
  await user.click('#user-action');
  assert.equal(await user.evaluate(() => Reflect.get(window, 'markerClicks')), 1);
  assert.equal(await user.$(`[${ANNOTATION_ANCHOR_ATTRIBUTE}]`), null, 'Source anchors are bookkeeping rather than live application attributes.');
  assert.equal(runtime.pages.shared.latest?.html.includes('agui-viewer-markers'), false);
  let sequence = runtime.pages.shared.viewSequence;
  await user.$eval('#pointer-target', (element) => { element.textContent = 'Updated target'; });
  await first.bringToFront();
  await first.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.querySelector('#pointer-target')?.textContent === 'Updated target';
  });
  assert.ok(runtime.pages.shared.viewSequence > sequence);
  assert.equal((await hoverMirror(first, '#pointer-target')).anchor, target.anchor, 'Snapshot replacement preserves node identity.');
  await first.setViewport({
    width: 620,
    height: 850,
    deviceScaleFactor: 2,
  });
  await hoverMirror(first, '#pointer-target');
  await waitAt(user, firstId, '#pointer-target');
  await user.$eval('#scroll-box', (element) => { element.scrollTop = 160; });
  await first.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    let box = frame.contentDocument?.getElementById('scroll-box');
    if (box) { box.scrollTop = 160; }
  });
  await hoverMirror(first, '#scroll-target');
  await waitAt(user, firstId, '#scroll-target');
  await hoverMirror(first, '#scroll-target');
  await first.mouse.wheel({
    deltaY: 40,
  });
  await first.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return (frame.contentDocument?.getElementById('scroll-box')?.scrollTop || 0) > 160;
  });
  let scrollTop = await first.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.getElementById('scroll-box')?.scrollTop;
  });
  assert.equal(await user.$eval('#scroll-box', (element) => element.scrollTop), 160);
  await user.$eval('#scroll-target', (element) => { element.textContent = 'Updated nested target'; });
  await first.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.getElementById('scroll-target')?.textContent === 'Updated nested target';
  });
  assert.equal(await first.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.getElementById('scroll-box')?.scrollTop;
  }), scrollTop, 'Snapshot replacement preserves independent viewer scrolling.');
  await hoverMirror(first, '#records tbody td[data-column="name"]');
  await waitAt(user, firstId, '#records tbody td[data-column="name"]');
  await hoverMirror(first, '#map-target');
  await waitAt(user, firstId, '#map-target');
  await user.click('#dialog > button');
  await first.bringToFront();
  await first.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.querySelector('.agui-mirror-modal #dialog-target');
  });
  await hoverMirror(first, '#dialog-target');
  await waitAt(user, firstId, '#dialog-target');
  await user.click('#dialog dialog button');
  await user.click('#show-popup');
  await first.bringToFront();
  await first.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.querySelector('#popup[data-agui-mirror-surface="popover"]');
  });
  await hoverMirror(first, '#popup-target');
  await waitAt(user, firstId, '#popup-target');
  await user.$eval('#popup', (element) => /** @type {HTMLElement} */ (element).hidePopover());
  await first.bringToFront();
  await first.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return !frame.contentDocument?.querySelector('#popup[data-agui-mirror-surface="popover"]');
  });
  await hoverMirror(first, '#pointer-target');
  await waitAt(user, firstId, '#pointer-target');
  await user.$eval('#pointer-target', (element) => element.remove());
  await first.bringToFront();
  await first.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return !frame.contentDocument?.getElementById('pointer-target');
  });
  await user.bringToFront();
  assert.equal(runtime.pages.shared.annotations.anchors.has(target.anchor || ''), false);
  assert.notEqual(Array.from(runtime.pages.shared.annotations.members.values())[0].presence.point?.anchor, target.anchor);
  await first.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    frame.contentDocument?.getElementById('pointer-target')?.dispatchEvent(new PointerEvent('pointerleave'));
    frame.contentDocument?.documentElement.dispatchEvent(new PointerEvent('pointerleave'));
  });
  await user.bringToFront();
  await user.waitForFunction((id) => !document.querySelector(`[data-viewer="${id}"]`), {}, firstId);
  await second.close();
  await user.waitForFunction(() => document.querySelectorAll('agui-viewer-markers [data-viewer]').length === 0);
  await first.close();
  let reconnected = await browser.newPage();
  reconnected.on('pageerror', (error) => { errors.push(String(error)); t.diagnostic(String(error)); });
  await reconnected.goto(runtime.record.url + '?mode=viewer');
  await reconnected.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#notes input[data-agui-anchor]');
  });
  await hoverMirror(reconnected, '#notes input');
  let newId = Array.from(runtime.pages.shared.annotations.members.values())[0].presence.id;
  assert.notEqual(newId, firstId);
  await waitAt(user, newId, '#notes input');
  await reconnected.close();
  await user.waitForFunction(() => document.querySelectorAll('agui-viewer-markers [data-viewer]').length === 0);
  assert.deepEqual(errors, []);
});
