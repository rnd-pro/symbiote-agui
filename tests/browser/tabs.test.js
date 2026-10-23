import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;
let profileButton = '#record-tabs > .agui-tabs-list button[value="profile"]';
let notesButton = '#record-tabs > .agui-tabs-list button[value="notes"]';

test('declarative tabs preserve drafts, publish explicit selection, and isolate keyboard and viewer state', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'tabs').catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'tabs', '--no-open');
  let html = await readFile(new URL('./tabs.html', import.meta.url), 'utf8');
  await insertStdin('tabs', html);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector(notesButton);
  assert.equal(await page.$eval(profileButton, (element) => element.getAttribute('aria-selected')), 'true');
  assert.equal(await page.$eval('#profile-panel', (element) => element.getAttribute('role')), 'tabpanel');
  assert.equal(await page.$eval('#notes-panel', (element) => element.hasAttribute('hidden')), true);
  assert.equal(await page.$eval(profileButton, (element) => document.getElementById(element.getAttribute('aria-controls') || '')?.getAttribute('aria-labelledby') === element.id), true);
  await page.type('#profile-draft', 'Unsaved profile');
  await page.$eval('#profile-draft', (element) => { Reflect.set(window, 'originalInput', element); });
  await cli('events', 'tabs');

  await page.focus(profileButton);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('value')), 'notes');
  assert.equal(await page.$eval('#tabs-data', (element) => Reflect.get(element, '$').view), 'profile');
  await page.keyboard.press('Enter');
  assert.equal(await page.$eval('#tabs-data', (element) => Reflect.get(element, '$').view), 'notes');
  assert.equal(await page.$eval('#profile-panel', (element) => element.hasAttribute('hidden')), true);
  await page.type('#notes-draft input', 'Unsaved notes');
  await page.focus(notesButton);
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('value')), 'notes');
  await page.keyboard.press('Home');
  await page.keyboard.press('Space');
  assert.equal(await page.$eval('#profile-draft', (element) => element instanceof HTMLInputElement ? element.value : null), 'Unsaved profile');
  assert.equal(await page.$eval('#profile-draft', (element) => element === Reflect.get(window, 'originalInput')), true);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('value')), 'notes');
  await page.keyboard.press('Tab');
  assert.equal(await page.$eval(profileButton, (element) => element.getAttribute('tabindex')), '0');
  assert.equal(await page.$eval(notesButton, (element) => element.getAttribute('tabindex')), '-1');
  await page.click('#nested-tabs > .agui-tabs-list button[value="two"]');
  assert.equal(await page.$eval(profileButton, (element) => element.getAttribute('aria-selected')), 'true');
  assert.equal(await page.$eval('#independent-tabs > .agui-tabs-list button[value="one"]', (element) => element.getAttribute('aria-selected')), 'true');

  await cli('events', 'tabs');
  await sendStdin('update', 'tabs', JSON.stringify({
    selector: '#tabs-data',
    values: {
      view: 'missing',
      notesLabel: 'Activity',
      orientation: 'vertical',
    },
  }));
  assert.equal(await page.$eval('#tabs-data', (element) => Reflect.get(element, '$').view), 'missing');
  assert.equal(await page.$eval(profileButton, (element) => element.getAttribute('aria-selected')), 'true');
  assert.equal(await page.$eval(notesButton, (element) => element.textContent), 'Activity');
  assert.equal((await cli('events', 'tabs')).events.length, 0);
  await page.focus(profileButton);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  assert.equal(await page.$eval('#notes-draft input', (element) => element.value), 'Unsaved notes');
  await cli('events', 'tabs');
  await sendStdin('update', 'tabs', JSON.stringify({
    selector: '#tabs-data',
    values: {
      notesDisabled: true,
    },
  }));
  assert.equal(await page.$eval(profileButton, (element) => element.getAttribute('aria-selected')), 'true');
  assert.equal(await page.$eval('#tabs-data', (element) => Reflect.get(element, '$').view), 'notes');
  assert.equal((await cli('events', 'tabs')).events.length, 0);

  let discovery = await cli('tools', 'tabs');
  let setTool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-tabs' && tool.key === 'set_value'
    && JSON.parse(tool.componentDescription).id === 'record-tabs');
  assert.ok(setTool);
  assert.ok(discovery.tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-tab-button' && tool.key === 'select'));
  let call = {
    pageId: discovery.pageId,
    discoveryId: discovery.discoveryId,
    name: setTool.name,
    input: {
      value: 'notes',
    },
  };
  await assert.rejects(sendStdin('call', 'tabs', JSON.stringify(call)));
  call.input.value = 'profile';
  assert.deepEqual((await sendStdin('call', 'tabs', JSON.stringify(call))).result, {
    value: 'profile',
    changed: false,
  });
  await sendStdin('update', 'tabs', JSON.stringify({
    selector: '#tabs-data',
    values: {
      notesDisabled: false,
    },
  }));
  discovery = await cli('tools', 'tabs');
  call.discoveryId = discovery.discoveryId;
  call.input.value = 'profile';
  assert.deepEqual((await sendStdin('call', 'tabs', JSON.stringify(call))).result, {
    value: 'profile',
    changed: true,
  });
  await sendStdin('update', 'tabs', JSON.stringify({
    selector: '#tabs-data',
    values: {
      readonly: true,
    },
  }));
  discovery = await cli('tools', 'tabs');
  call.discoveryId = discovery.discoveryId;
  call.input.value = 'notes';
  await assert.rejects(sendStdin('call', 'tabs', JSON.stringify(call)));

  await cli('share', 'tabs');
  let viewer = await browser.newPage();
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#profile-panel')?.getAttribute('role') === 'tabpanel';
  });
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert && !frame.contentWindow?.customElements.get('agui-tabs');
  }), true);
  await sendStdin('update', 'tabs', JSON.stringify({
    selector: '#tabs-data',
    values: {
      view: 'notes',
    },
  }));
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#notes-panel')?.hasAttribute('hidden') === false;
  });
  await page.bringToFront();
  let fixtureIds = await page.$$eval('#tabs-data agui-tabs', (elements) => elements.map((element) => element.id));
  let owners = discovery.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ tool) => {
    if (tool.ownerName !== 'agui-tabs' && tool.ownerName !== 'agui-tab-button') { return false; }
    let context = JSON.parse(tool.componentDescription);
    return fixtureIds.includes(context.id || context.tabsId);
  }).map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerId);
  await page.$eval('#record-tabs', (element) => { Reflect.set(window, 'oldTabs', element); });
  await insertStdin('tabs', '<p>Replaced</p>');
  await page.waitForFunction(() => Reflect.get(window, 'oldTabs').allSubs.size === 0);
  assert.equal((await cli('tools', 'tabs')).tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => owners.includes(tool.ownerId)), false);
  assert.deepEqual(errors, []);
});
