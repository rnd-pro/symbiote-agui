import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import puppeteer from 'puppeteer';
import { connectorFixture } from '../node/connector-fixture.js';
import { cli, insertStdin } from './helpers.js';
import { setupExample } from '../../docs/examples/connectors/setup.js';
import { definitionPaths } from '../../src/library/paths.js';
import { core } from '../../src/connectors/core.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';

test('declarative connector writes only on explicit action and never publishes a late result over a newer draft', {
  timeout: 45000,
}, async (t) => {
  let f = await connectorFixture(t);
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  f.cleanup(async () => {
    await browser.close();
    await cli('stop', 'backend').catch(() => {});
  });
  await f.attach();
  await f.grant('backend', 'agui');
  let started = await cli('start', 'backend', '--no-open');
  await insertStdin('backend', `<context-provider id="form" ctx="FORM">
    <script type="application/json">{"draft":{"value":"first","delay":700},"saved":null}</script>
    <context-provider ctx="EDITOR" pub-to="FORM/draft" bind="state: FORM/draft">
      <agui-field label="Record" pub-to="EDITOR/value" bind="$.value: EDITOR/value"></agui-field>
    </context-provider>
    <agui-connector id="save" action="save" pub-to="FORM/saved" bind="$.input: FORM/draft">
      <button id="save-record" type="button" bind="onclick: run; disabled: unavailable">Save</button>
      <button id="reconcile" type="button" bind="onclick: read_receipt; disabled: receiptUnavailable">Check outcome</button>
      <output id="outcome">{{outcome}}</output>
    </agui-connector>
    <agui-connector id="automatic-write" action="save" load bind="$.input: FORM/draft"></agui-connector>
    <agui-connector id="missing" action="missing"></agui-connector>
  </context-provider>`);
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(/** @type {string} */ (started.url));
  await page.waitForFunction(() => Reflect.get(document.querySelector('#save') ?? {}, '$')?.unavailable === false);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#automatic-write') ?? {}, '$')?.error === 'AUTOLOAD_WRITE_DENIED');
  assert.equal(await page.$eval('#missing', (element) => Reflect.get(element, '$').error), 'ACTION_UNAVAILABLE');
  await page.type('agui-field input', ' changed');
  await assert.rejects(readFile(f.log), {
    code: 'ENOENT',
  });
  await page.click('#save-record');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#save') ?? {}, '$').pending);
  await page.type('agui-field input', ' newer');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#save') ?? {}, '$').outcome === 'completed');
  assert.equal(await page.$eval('#save', (element) => Reflect.get(element, '$').stale), true);
  assert.equal(await page.$eval('#form', (element) => Reflect.get(element, '$')['FORM/saved']), null);
  await page.waitForFunction(() => !Reflect.get(document.querySelector('#save') ?? {}, '$').unavailable);
  await page.click('#save-record');
  await page.$eval('#form', (element) => {
    let state = Reflect.get(element, '$');
    state['FORM/draft'] = {
      ...state['FORM/draft'],
    };
  });
  await page.waitForFunction(() => Reflect.get(document.querySelector('#form') ?? {}, '$')['FORM/saved']?.value.endsWith('newer'));
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 2);
  await page.click('#save-record');
  let requestId = await page.$eval('#save', (element) => Reflect.get(element, '$').requestId);
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await core.listReceipts(f.coreRoot)).some((entry) => entry.requestId === requestId)) { break; }
    await delay(20);
  }
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.waitForFunction(() => Reflect.get(document.querySelector('#save') ?? {}, '$').outcome === 'unknown');
  assert.equal(await page.$eval('#save', (element) => Reflect.get(element, '$').unavailable), true);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction(() => Reflect.get(document.querySelector('#save') ?? {}, 'connected'));
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await core.getReceipt(f.coreRoot, requestId)).state === 'completed') { break; }
    await delay(20);
  }
  await page.click('#reconcile');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#save') ?? {}, '$').outcome === 'completed');
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 3);
  await page.waitForFunction(() => !Reflect.get(document.querySelector('#save') ?? {}, '$').unavailable);
  await page.click('#save-record');
  let removedRequest = await page.$eval('#save', (element) => Reflect.get(element, '$').requestId);
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await core.listReceipts(f.coreRoot)).some((entry) => entry.requestId === removedRequest)) { break; }
    await delay(20);
  }
  await page.$eval('#save', (element) => element.remove());
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await core.getReceipt(f.coreRoot, removedRequest)).state === 'completed') { break; }
    await delay(20);
  }
  assert.equal(await page.$eval('#form', (element) => Reflect.get(element, '$')['FORM/saved'].requestId), requestId);
  assert.deepEqual(errors, []);
});

test('manager reviews and grants a stopped session backend through its local connector dialog', {
  timeout: 45000,
}, async (t) => {
  let f = await connectorFixture(t);
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 1000,
    },
  });
  f.cleanup(async () => {
    await browser.close();
    await cli('manager', 'stop').catch(() => {});
  });
  await f.attach();
  let manager = await cli('manager', '--no-open');
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('dialog', (dialog) => { void dialog.accept(); });
  await page.goto(manager.launchUrl);
  await page.waitForSelector('#session-views [role="tab"][value="cards"]');
  await page.click('#session-views [role="tab"][value="cards"]');
  await page.waitForSelector('#manager-cards [data-session="backend"] h3');
  await page.click('#manager-cards [data-session="backend"] h3');
  await page.locator('#manager-inspector ::-p-aria([name="Connector backends"][role="button"])').click();
  await page.waitForFunction(() => document.querySelector('#manager-connectors dialog')?.hasAttribute('open'));
  await page.waitForFunction(() => document.querySelector('#manager-connectors')?.textContent?.includes('access: none'));
  await page.click('#manager-connectors button[aria-label="Review source"]');
  await page.waitForFunction(() => {
    let state = Reflect.get(document.querySelector('agui-session-manager') ?? {}, '$');
    return !state.connectorGrantDisabled || state.connectorError;
  });
  assert.equal(await page.$eval('agui-session-manager', (element) => Reflect.get(element, '$').connectorError), '');
  assert.ok(await page.$eval('#connector-source', (element) => element.textContent?.includes('context.verified')));
  await page.click('#manager-connectors button.agui-button-primary');
  await page.waitForFunction(() => document.querySelector('#manager-connectors')?.textContent?.includes('access: agui'));
  await assert.rejects(readFile(f.log), {
    code: 'ENOENT',
  });
  assert.deepEqual(errors, []);
});

test('packaged records example reads and saves verified data without executable session JavaScript', {
  timeout: 45000,
}, async (t) => {
  let f = await connectorFixture(t);
  let example = await setupExample(join(f.directory, 'example'));
  let tunnel = process.platform === 'win32' ? undefined : await tunnelFixture(f.directory);
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  f.cleanup(async () => {
    await browser.close();
    await cli('stop', 'records').catch(() => {});
    tunnel?.close();
  });
  await cli('save', 'records', '--file', join(example.directory, 'records.html'));
  await writeFile(definitionPaths('records').descriptionPath, await readFile(join(example.directory, 'records.md')));
  for (let action of example.actions) {
    await cli('connector', 'attach', 'records', action.action, '--registry', example.registry, '--script', action.address);
    await cli('connector', 'grant', 'records', action.action, '--revision', action.revision, '--source', 'agui', '--profile', example.profile);
  }
  let started = await cli('start', 'records', '--no-open');
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(started.url);
  await page.waitForFunction(() => Reflect.get(document.querySelector('agui-connector[action="read"]') ?? {}, '$')?.unavailable === false);
  await page.locator('::-p-aria([name="Load records"][role="button"])').click();
  await page.waitForFunction(() => {
    let state = Reflect.get(document.querySelector('agui-connector[action="read"]') ?? {}, '$');
    return state.outcome === 'completed' || state.outcome === 'rejected' || state.outcome === 'unknown';
  });
  assert.equal(await page.$eval('agui-connector[action="read"]', (element) => Reflect.get(element, '$').error), '');
  await page.waitForFunction(() => document.querySelector('agui-table')?.textContent?.includes('Second example record'));
  await page.locator('agui-field[name="recordLabel"] input').fill('Reviewed example edit');
  let dataPath = join(example.directory, 'records.json');
  assert.equal(JSON.parse(await readFile(dataPath, 'utf8')).draft.label, 'First example record');
  await page.locator('::-p-aria([name="Save record"][role="button"])').click();
  await page.waitForFunction(() => Reflect.get(document.querySelector('agui-connector[action="save"]') ?? {}, '$').outcome === 'completed');
  assert.equal(JSON.parse(await readFile(dataPath, 'utf8')).draft.label, 'Reviewed example edit');
  assert.equal(await page.$eval('agui-connector[action="save"]', (element) => Reflect.get(element, '$').stale), false);
  await page.evaluate(() => {
    let eager = document.createElement('agui-connector');
    eager.id = 'initial-read';
    eager.setAttribute('action', 'read');
    eager.setAttribute('load', '');
    document.body.append(eager);
  });
  await page.waitForFunction(() => Reflect.get(document.querySelector('#initial-read') ?? {}, '$').outcome === 'completed');
  let beforeReconnect = (await core.listReceipts(f.coreRoot)).length;
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction(() => Reflect.get(document.querySelector('#initial-read') ?? {}, 'connected'));
  assert.equal((await core.listReceipts(f.coreRoot)).length, beforeReconnect);
  if (tunnel) {
    await cli('share', 'records');
    let viewer = await browser.newPage();
    await viewer.goto(`${started.url}?mode=viewer`);
    await viewer.waitForFunction(() => {
      let frame = /** @type {HTMLIFrameElement | null} */ (document.querySelector('#agui-viewer'));
      return frame?.contentDocument?.querySelector('agui-table')?.textContent?.includes('Reviewed example edit');
    });
    let denied = await viewer.evaluate(async () => {
      let api = await import(new URL('/client/index.js', location.href).href);
      return api.callConnector('save', {
        id: 'record-1',
        label: 'must not write',
      }, {
        requestId: crypto.randomUUID(),
      });
    });
    assert.equal(denied.state, 'rejected');
    assert.equal(JSON.parse(await readFile(dataPath, 'utf8')).draft.label, 'Reviewed example edit');
  }
  await page.bringToFront();
  await insertStdin('records', '<agui-connector id="mounted-read" action="read" load></agui-connector>');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#mounted-read') ?? {}, '$')?.outcome === 'completed');
  assert.equal((await core.listReceipts(f.coreRoot)).length, beforeReconnect + 1);
  assert.deepEqual(errors, []);
});
