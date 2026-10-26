import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { readRuntimeCache, runtimeCachePath } from '../../src/data/cache.js';
import { temporaryState } from '../node/state-fixture.js';
import { clickDataAction } from './helpers.js';
import { updateMetadata } from '../../src/metadata/store.js';
import { sampleMetadata } from '../node/metadata-fixture.js';
import { definitionPaths } from '../../src/library/paths.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

function createRuntime() {
  return new SessionRuntime({ sessionId: 'toolbar-test', instanceId: randomUUID(), controlToken: '', pid: process.pid, launcherPid: process.pid });
}

test('declarative data toolbar saves, cancels, imports offline, delivers one bounded reference, and keeps viewer status local', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.', timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let runtime = createRuntime();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  let release = () => {};
  t.after(async () => { release(); await browser?.close(); await runtime.close(); await state.close(); });
  let saved = await prepareCachedMarkup('toolbar-test', await readFile(new URL('./data-toolbar.html', import.meta.url), 'utf8'));
  try { await saved.commit(); } finally { await saved.discard(); }
  await runtime.start(new AbortController().signal);
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10_000, protocolTimeout: 10_000 });
  let page = await browser.newPage();
  let cdp = await browser.target().createCDPSession();
  let downloads = join(state.directory, 'downloads');
  await mkdir(downloads);
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  assert.ok(runtime.record.url);
  await page.goto(runtime.record.url);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.connectionLabel === 'Connected');
  assert.equal(await page.$eval('#data .agui-data-panel', (element) => element.matches(':popover-open')), false);
  assert.match(await page.$eval('#data .agui-data-trigger', (element) => element.getAttribute('aria-label') || ''), /Data actions/);
  await page.focus('#data .agui-data-trigger');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#data .agui-data-panel')?.matches(':popover-open'));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#data .agui-data-panel')?.matches(':popover-open'));
  assert.equal(await page.$eval('#data .agui-data-trigger', (element) => element === document.activeElement), true);
  await page.$eval('#data', (element) => element.setAttribute('message-timeout', '150'));
  await page.type('#name input', 'First');
  await page.waitForFunction(() => document.querySelector('#data agui-message')?.matches(':popover-open'));
  await page.waitForFunction(() => document.querySelector('#data agui-message')?.hasAttribute('hidden'));
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, '$').dirty), true);
  assert.match(await page.$eval('#data .agui-data-trigger', (element) => element.getAttribute('aria-label') || ''), /Unsaved changes/);
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'First');
  await page.$eval('#data', (element) => element.setAttribute('message-timeout', '5000'));
  await page.type('#email input', 'bad-address');
  await clickDataAction(page, '#data', 'Save');
  assert.equal(await readRuntimeCache('toolbar-test'), undefined);
  assert.match(await page.$eval('#data [data-kind="issue"][data-tone="error"]', (element) => element.textContent || ''), /Check the form fields/);
  await page.locator('#data .agui-data-trigger').click();
  await page.waitForFunction(() => !document.querySelector('#data .agui-data-panel')?.matches(':popover-open'));
  await clickDataAction(page, '#data', 'Save');
  assert.match(await page.$eval('#data [data-kind="issue"][data-tone="error"]', (element) => element.textContent || ''), /Check the form fields/);
  await page.$eval('#email input', (element) => { Reflect.set(element, 'value', ''); element.dispatchEvent(new Event('input', { bubbles: true })); });
  await clickDataAction(page, '#data', 'Save');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.delivery?.failure?.code === 'DISABLED');
  assert.match((await readRuntimeCache('toolbar-test'))?.html || '', /"name":"First"/);
  await page.type('#name input', ' draft');
  await clickDataAction(page, '#data', 'Cancel changes');
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
  await clickDataAction(page, '#data', 'Export JSON');
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, 'transferState').state), 'download-started');
  await clickDataAction(page, '#data', 'Cancel changes');
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
  await clickDataAction(page, '#data', 'Save');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.result === undefined);
  await page.type('#name input', ' newer draft');
  await page.evaluate(() => {
    Reflect.set(window, 'originalCreateObjectURL', URL.createObjectURL);
    URL.createObjectURL = () => { throw new Error('Controlled download failure.'); };
  });
  await clickDataAction(page, '#data', 'Export JSON');
  await page.evaluate(() => { URL.createObjectURL = Reflect.get(window, 'originalCreateObjectURL'); });
  release();
  await gate;
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.delivery?.state === 'accepted');
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, '$').dirty), true);
  assert.match(await page.$eval('#data [data-kind="transfer"][data-tone="error"]', (element) => element.textContent || ''), /Could not start the JSON download/);
  assert.match(await page.$eval('#data [data-kind="local"][data-tone="success"]', (element) => element.textContent || ''), /Saved locally/);
  assert.match(await page.$eval('#data [data-kind="external"][data-tone="warning"]', (element) => element.textContent || ''), /pending verification/);
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
  await clickDataAction(page, '#data', 'Save');
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
  if (!await page.$eval('#data .agui-data-panel', (element) => element.matches(':popover-open'))) {
    await page.locator('#data .agui-data-trigger').click();
  }
  let viewer = await browser.newPage();
  viewer.on('pageerror', (error) => errors.push(String(error)));
  await viewer.goto(runtime.record.url + '?mode=viewer');
  await viewer.waitForFunction(() => document.querySelector('agui-data-toolbar')?.textContent?.includes('Viewer'));
  assert.match(await viewer.$eval('agui-data-toolbar', (element) => element.textContent || ''), /Connected/);
  assert.equal(await viewer.$$eval('agui-data-toolbar agui-toolbar button:not([hidden])', (buttons) => buttons.every((button) => Reflect.get(button, 'disabled'))), true);
  await viewer.locator('agui-data-toolbar .agui-data-trigger').click();
  await viewer.waitForFunction(() => document.querySelector('agui-data-toolbar .agui-data-panel')?.matches(':popover-open'));
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.querySelector('iframe'));
    return frame?.contentDocument?.querySelectorAll('agui-data-toolbar, .agui-data-panel').length;
  }), 0);
  await viewer.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.match(await viewer.$eval('agui-data-toolbar', (element) => element.textContent || ''), /Disconnected/);

  await runtime.close();
  runtime = createRuntime();
  await runtime.start(new AbortController().signal);
  assert.ok(runtime.record.url);
  await page.bringToFront();
  await page.goto(runtime.record.url);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.connectionLabel === 'Connected');
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'First Second');
  input = await page.$('input[type=file]');
  assert.ok(input);
  await input.uploadFile(file);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'transferState')?.state === 'imported');
  await page.type('#name input', ' changed');
  await clickDataAction(page, '#data', 'Save');
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, 'submission')?.result?.state === 'committed');
  await runtime.close();
  runtime = createRuntime();
  await runtime.start(new AbortController().signal);
  assert.ok(runtime.record.url);
  await page.goto(runtime.record.url);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.connectionLabel === 'Connected');
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'Imported changed');
  let restoredDownloads = join(state.directory, 'restored-downloads');
  await mkdir(restoredDownloads);
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: restoredDownloads, eventsEnabled: true });
  let downloaded = new Promise((resolve) => cdp.on('Browser.downloadProgress', (event) => { if (event.state === 'completed') { resolve(event.guid); } }));
  await clickDataAction(page, '#data', 'Export JSON');
  await downloaded;
  assert.deepEqual(JSON.parse(await readFile(join(restoredDownloads, 'agui-data.json'), 'utf8')), {
    version: 1, changes: [{ provider: 'APP', values: { name: 'Imported changed', email: '' } }],
  });
  assert.deepEqual(errors, []);
});

test('session information dialogs read fresh files without changing drafts or activating description components', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 30_000,
}, async (t) => {
  let state = await temporaryState();
  let runtime = createRuntime();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await runtime.close();
    await state.close();
  });
  let saved = await prepareCachedMarkup('toolbar-test', await readFile(new URL('./data-toolbar.html', import.meta.url), 'utf8'));
  try { await saved.commit(); } finally { await saved.discard(); }
  let paths = definitionPaths('toolbar-test');
  await writeFile(paths.descriptionPath, '# Session briefing\n\nTask data flow.\n\n<agui-button id="untrusted-control">Do not activate</agui-button>');
  await runtime.start(new AbortController().signal);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    timeout: 10_000,
    protocolTimeout: 10_000,
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  assert.ok(runtime.record.url);
  await page.goto(runtime.record.url);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.connectionLabel === 'Connected');
  await page.type('#name input', 'Unsaved draft');
  await clickDataAction(page, '#data', 'Description');
  await page.waitForFunction(() => document.querySelector('#data dialog[open] article')?.textContent?.includes('Session briefing'));
  assert.equal(await page.$('#data dialog[open] agui-button'), null);
  assert.equal(await page.$eval('#data dialog[open]', (element) => element.getAttribute('aria-label')), 'Description');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#data dialog[open]'));
  let metadata = sampleMetadata();
  await updateMetadata('toolbar-test', () => metadata);
  await clickDataAction(page, '#data', 'Metadata');
  await page.waitForFunction(() => document.querySelector('#data dialog[open] pre code')?.textContent?.includes('demo.inventory'));
  assert.deepEqual(JSON.parse(await page.$eval('#data dialog[open] pre code', (element) => element.textContent || '')), metadata);
  assert.equal(await page.$eval('#data agui-markdown', (element) => element.hasAttribute('hidden')), true);
  await page.locator('#data dialog[open] .agui-dialog-heading button').click();
  await page.waitForFunction(() => !document.querySelector('#data dialog[open]'));
  await writeFile(paths.descriptionPath, '# Updated briefing');
  await clickDataAction(page, '#data', 'Description');
  await page.waitForFunction(() => document.querySelector('#data dialog[open] article')?.textContent?.includes('Updated briefing'));
  assert.equal(await page.$eval('#data dialog pre', (element) => element.hidden), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#name input', (element) => Reflect.get(element, 'value')), 'Unsaved draft');
  assert.equal(await page.$eval('#data', (element) => Reflect.get(element, '$').dirty), true);
  assert.equal(await readRuntimeCache('toolbar-test'), undefined);
  assert.equal(runtime.feedback.status().pending, 0);
  assert.deepEqual(errors, []);
});

test('partial outcomes produce independently dismissible success, warning, and error notifications', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 30_000,
}, async (t) => {
  let state = await temporaryState();
  let runtime = createRuntime();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await runtime.close();
    await state.close();
  });
  let saved = await prepareCachedMarkup('toolbar-test', await readFile(new URL('./data-toolbar.html', import.meta.url), 'utf8'));
  try { await saved.commit(); } finally { await saved.discard(); }
  await runtime.start(new AbortController().signal);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  let page = await browser.newPage();
  page.setDefaultTimeout(8_000);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  assert.ok(runtime.record.url);
  await page.goto(runtime.record.url);
  await page.waitForFunction(() => Reflect.get(document.querySelector('#data') || {}, '$')?.connectionLabel === 'Connected');
  await page.$eval('#data', (element) => {
    let toolbar = /** @type {import('../../src/page/client/uilib/controls/data-toolbar/data-toolbar.js').DataToolbar} */ (element);
    let data = /** @type {import('../../types/data.js').DataStatus} */ (toolbar.$['AGUI_DATA/current']);
    let reference = {
      commitId: crypto.randomUUID(),
      instanceId: data.instanceId,
      markupRevision: data.markupRevision,
      revision: data.revision,
    };
    toolbar.$.messageTimeout = 60_000;
    toolbar.submission = {
      reference,
      changes: [],
      result: {
        ...reference,
        state: 'committed',
      },
      delivery: {
        submissionId: reference.commitId,
        instanceId: reference.instanceId,
        state: 'rejected',
        failure: {
          code: 'DISABLED',
          message: '',
        },
      },
    };
    toolbar.transferState = {
      operation: 'export',
      state: 'error',
      message: '',
      failure: {
        code: 'EXPORT_FAILED',
        message: '',
      },
    };
    toolbar.refresh(true);
  });
  for (let tone of [
    'success',
    'warning',
    'error',
  ]) { await page.waitForSelector(`#data agui-message[data-tone="${tone}"]:popover-open`); }
  assert.equal(await page.$eval('#data agui-message[data-tone="success"] p', (element) => element.textContent), 'Saved locally');
  assert.match(await page.$eval('#data agui-message[data-tone="warning"] p', (element) => element.textContent || ''), /Agent delivery unavailable/);
  assert.match(await page.$eval('#data agui-message[data-tone="error"] p', (element) => element.textContent || ''), /Could not start the JSON download/);
  assert.equal(await page.$eval('#data agui-message[data-tone="error"] p', (element) => element.getAttribute('role')), 'alert');
  assert.equal(await page.$eval('#data agui-message[data-tone="warning"] p', (element) => element.getAttribute('role')), 'status');
  await page.locator('#data agui-message[data-tone="warning"] button').click();
  await page.waitForFunction(() => document.querySelector('#data agui-message[data-tone="warning"]')?.hasAttribute('hidden'));
  await page.$eval('#data', (element) => Reflect.get(element, 'refresh').call(element));
  assert.equal(await page.$eval('#data agui-message[data-tone="warning"]', (element) => element.hasAttribute('hidden')), true);
  assert.equal(await page.$eval('#data agui-message[data-tone="success"]', (element) => element.matches(':popover-open')), true);
  assert.equal(await page.$eval('#data agui-message[data-tone="error"]', (element) => element.matches(':popover-open')), true);
  await page.locator('#data .agui-data-trigger').click();
  await page.waitForFunction(() => !document.querySelector('#data agui-message:popover-open'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#data .agui-data-panel')?.matches(':popover-open'));
  assert.equal(await page.$('#data agui-message:popover-open'), null);
  assert.deepEqual(errors, []);
});
