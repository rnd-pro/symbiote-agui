import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { readRuntimeCache } from '../../src/data/cache.js';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;
let trigger = '#record-editor > button';
let dialog = '#record-editor > dialog';

test('dialogs publish dismissal once, preserve drafts, and mirror native overlays without viewer interaction', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'dialogs').catch(() => {});
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'dialogs', '--no-open');
  await insertStdin('dialogs', await readFile(new URL('./dialogs.html', import.meta.url), 'utf8'));
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
  await page.waitForSelector(trigger);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#editor-toolbar') || {}, '$')?.connectionLabel === 'Connected');
  assert.equal(await page.$eval(dialog, (element) => element.hasAttribute('open')), false);
  assert.equal(await page.$eval(dialog, (element) => element.getAttribute('aria-label')), 'Edit contact');
  await cli('events', 'dialogs');

  await page.click(trigger);
  assert.equal(await page.$eval(dialog, (element) => element.matches(':modal')), true);
  await page.$eval('#dialog-name input', (element) => { Reflect.set(window, 'originalDraft', element); });
  await page.type('#dialog-name input', ' draft');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#dialog-data') || {}, '$')?.editorOpen === false);
  let events = (await cli('events', 'dialogs')).events.filter((/** @type {{data: {widgetId?: string}}} */ event) => event.data.widgetId === 'record-editor');
  assert.deepEqual(events.map((/** @type {{data: {value: boolean}}} */ event) => event.data.value), [
    true,
    false,
  ]);
  assert.equal(await readRuntimeCache('dialogs'), undefined);
  await page.click(trigger);
  assert.equal(await page.$eval('#dialog-name input', (element) => element === Reflect.get(window, 'originalDraft') && Reflect.get(element, 'value') === 'Baseline draft'), true);
  await page.click('#form-close');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#dialog-data') || {}, '$')?.editorOpen === false);
  await page.click('#editor-toolbar button:nth-child(2)');
  assert.equal(await page.$eval('#dialog-name input', (element) => Reflect.get(element, 'value')), 'Baseline');
  await page.click(trigger);
  await page.type('#dialog-name input', ' saved');
  await page.click('#record-editor .agui-dialog-heading button');
  await page.click('#editor-toolbar button');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#editor-toolbar') || {}, 'submission')?.result?.state === 'committed');
  assert.match((await readRuntimeCache('dialogs'))?.html || '', /"name":"Baseline saved"/);

  await cli('events', 'dialogs');
  await sendStdin('update', 'dialogs', JSON.stringify({
    selector: '#dialog-data',
    values: {
      editorOpen: true,
      label: 'Contact details',
      closeLabel: 'Dismiss details',
    },
  }));
  assert.equal(await page.$eval(dialog, (element) => element.matches(':modal')), true);
  assert.equal(await page.$eval(dialog, (element) => element.getAttribute('aria-label')), 'Contact details');
  assert.equal(await page.$eval('#record-editor .agui-dialog-heading button', (element) => element.getAttribute('aria-label')), 'Dismiss details');
  assert.equal(await page.$eval('#independent-editor dialog', (element) => element.hasAttribute('open')), false);
  await sendStdin('update', 'dialogs', JSON.stringify({
    selector: '#dialog-data',
    values: {
      editorOpen: false,
    },
  }));
  assert.equal((await cli('events', 'dialogs')).events.length, 0);
  // A queued close event must not overwrite a newer incoming open value.
  await page.$eval('#dialog-data', (element) => {
    let data = Reflect.get(element, '$');
    data.editorOpen = true;
    data.editorOpen = false;
    data.editorOpen = true;
  });
  await page.waitForFunction(() => Reflect.get(document.querySelector('#record-editor') || {}, '$')?.opened === true);

  let discovery = await cli('tools', 'dialogs');
  let owned = discovery.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-dialog'
    && JSON.parse(tool.componentDescription).id === 'record-editor');
  /** @param {string} key */
  let call = async (key) => {
    let tool = owned.find((/** @type {import('../../types/tools.js').PageTool} */ item) => item.key === key);
    assert.ok(tool);
    return (await sendStdin('call', 'dialogs', JSON.stringify({
      pageId: discovery.pageId,
      discoveryId: discovery.discoveryId,
      name: tool.name,
      input: {},
    }))).result;
  };
  assert.deepEqual(await call('open'), {
    value: true,
    changed: false,
  });
  assert.deepEqual(await call('read_value'), {
    value: true,
  });
  assert.deepEqual(await call('close'), {
    value: false,
    changed: true,
  });
  assert.deepEqual(await call('close'), {
    value: false,
    changed: false,
  });
  await call('open');

  await cli('share', 'dialogs');
  let viewer = await browser.newPage();
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return !!frame?.contentDocument?.querySelector('[data-agui-mirror-surface="dialog"]');
  });
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    let mirror = frame.contentDocument;
    return mirror?.body.inert && !mirror.querySelector(':modal, :popover-open')
      && !frame.contentWindow?.customElements.get('agui-dialog')
      && Reflect.get(mirror.querySelector('#dialog-name input') || {}, 'value') === 'Baseline saved';
  }), true);
  await page.bringToFront();
  await page.click('#dialog-help-trigger');
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.getElementById('dialog-help')?.dataset.aguiMirrorSurface === 'popover';
  }, {
    polling: 50,
  });
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval(dialog, (element) => element.matches(':modal')), true);
  await page.keyboard.press('Escape');
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument && !frame.contentDocument.querySelector('[data-agui-mirror-surface]');
  }, {
    polling: 50,
  });
  await page.click('#help-trigger');
  assert.equal(await page.$eval('#help-popup', (element) => element.matches(':popover-open')), true);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.getElementById('help-popup')?.dataset.aguiMirrorSurface === 'popover';
  }, {
    polling: 50,
  });
  await page.click('#independent-editor > button');
  assert.equal(await page.$eval('#help-popup', (element) => element.matches(':popover-open')), false);
  await page.$eval('#record-editor', (element) => { Reflect.set(window, 'oldDialog', element); });
  await cli('clear', 'dialogs');
  await page.waitForFunction(() => Reflect.get(window, 'oldDialog').allSubs.size === 0);
  assert.equal((await cli('tools', 'dialogs')).tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => owned.some((/** @type {import('../../types/tools.js').PageTool} */ item) => item.ownerId === tool.ownerId)), false);
  assert.equal(await page.evaluate(() => !!document.querySelector(':modal')), false);
  assert.deepEqual(errors, []);
});
