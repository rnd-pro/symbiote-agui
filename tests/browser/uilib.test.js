import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('default library bundle composes an HTML-only workspace with isolated contexts and native controls', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await cli('stop', 'widgets').catch(() => {});
    await browser?.close();
    await state.close();
  });
  let html = await readFile(new URL('../../src/page/uilib-gallery.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<script[^>]*type="module"/);
  let session = await cli('start', 'widgets', '--no-open');
  await insertStdin('widgets', html);
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-blink-features=WebMCP,WebMCPTesting'] });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.goto(session.url);
  await page.waitForSelector('#name-control input');
  await page.waitForFunction(() => document.querySelector('#submission-examples dt')?.textContent === 'Populated');
  assert.match(await page.$eval('#submission-examples', (element) => element.textContent || ''), /The cache write failed/);
  assert.equal(await page.$eval('#gallery-data-actions', (element) => Reflect.get(element, '$').roleLabel), 'User');
  assert.equal(await page.$eval('#name-control input', (element) => element.value), 'Alex');
  assert.equal(await page.$eval('#name-control label', (element) => element.control?.getAttribute('name')), 'name');
  assert.equal(await page.$eval('#name-control input', (element) => element.autocomplete), 'name');
  assert.equal(await page.$eval('#query-control input', (element) => element.type), 'search');
  assert.equal(await page.$eval('textarea[name="notes"]', (element) => element.rows), 3);
  assert.equal(await page.$eval('textarea[name="notes"]', (element) => element.value), 'Prepare a proposal after the first conversation.');
  assert.equal(await page.$eval('input[name="connected"]', (element) => element.checked), true);
  assert.equal(await page.$('agui-field slot'), null);
  assert.equal(await page.$eval('input[name="disabled_value"]', (element) => element.disabled), true);
  assert.equal(await page.$eval('input[name="saved_value"]', (element) => element.readOnly), true);
  assert.equal(await page.$eval('#notifications-toggle input', (element) => element.checked), true);
  assert.equal(await page.$eval('input[name="disabled_toggle"]', (element) => element.disabled), true);
  await page.click('#notifications-toggle label');
  assert.equal(await page.$eval('#notifications-toggle', (element) => Reflect.get(element, '$').value), false);
  assert.equal(await page.$eval('#gallery-data', (element) => Reflect.get(element, '$').theme), 'system');
  let styleCount = await page.evaluate(() => document.adoptedStyleSheets.length);
  assert.ok(styleCount > 0);
  assert.equal((html.match(/<context-provider/g) || []).length, 1);
  await page.$eval('#query-control', (element) => {
    element.setAttribute('placeholder', 'Find a contact');
    element.setAttribute('maxlength', '64');
    element.setAttribute('required', '');
  });
  await page.waitForFunction(() => document.querySelector('#query-control input')?.getAttribute('placeholder') === 'Find a contact');
  assert.equal(await page.$eval('#query-control input', (element) => element.maxLength), 64);
  assert.equal(await page.$eval('#query-control input', (element) => element.required), true);
  await page.$eval('#query-control', (element) => {
    element.removeAttribute('placeholder');
    element.removeAttribute('maxlength');
    element.removeAttribute('required');
  });
  await page.waitForFunction(() => !document.querySelector('#query-control input')?.hasAttribute('placeholder'));
  assert.equal(await page.$eval('#query-control input', (element) => element.maxLength), -1);
  assert.equal(await page.$eval('#query-control input', (element) => element.required), false);
  assert.equal(await page.$eval('#status-control select', (element) => element.options.length), 4);
  assert.equal(await page.$eval('#theme-toggle input', (element) => element.checked), false);
  assert.equal(await page.$eval('#theme-toggle input', (element) => element.getAttribute('role')), 'switch');
  assert.equal(await page.$eval('#theme-toggle input', (element) => element.getAttribute('aria-label')), 'Dark theme');
  assert.equal(await page.$eval('#theme-toggle label', (element) => element.innerText.trim()), 'Switch to dark theme');
  await page.click('#theme-toggle input');
  await page.waitForFunction(() => document.body.dataset.theme === 'dark' && document.querySelector('#theme-toggle input')?.matches(':checked'));
  assert.equal(await page.$eval('#gallery-data', (element) => Reflect.get(element, '$').theme), 'dark');
  assert.equal(await page.$eval('#theme-toggle label', (element) => element.innerText.trim()), 'Switch to light theme');
  await page.focus('#theme-toggle input');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.body.dataset.theme === 'light' && !document.querySelector('#theme-toggle input')?.matches(':checked'));
  assert.equal(await page.$eval('#theme-toggle label', (element) => element.innerText.trim()), 'Switch to dark theme');
  await sendStdin('update', 'widgets', JSON.stringify({ selector: '#gallery-data', values: { theme: 'system' } }));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.waitForFunction(() => document.querySelector('#theme-toggle input')?.matches(':checked'));
  await page.click('#theme-toggle label');
  assert.equal(await page.$eval('#gallery-data', (element) => Reflect.get(element, '$').theme), 'light');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await sendStdin('update', 'widgets', JSON.stringify({ selector: '#gallery-data', values: { theme: 'dark' } }));
  assert.equal(await page.$eval('#theme-toggle input', (element) => element.checked), true);
  await sendStdin('update', 'widgets', JSON.stringify({ selector: '#gallery-data', values: { density: 'compact' } }));
  await page.select('#status-control select', 'new');
  assert.equal(await page.$eval('#status-mirror select', (element) => element.value), '');
  assert.equal(await page.$eval('#status-control', (element) => Reflect.get(element, '$').value), 'new');
  await page.type('#query-control input', 'Ada');
  assert.equal(await page.$eval('#query-control', (element) => Reflect.get(element, '$').value), 'Ada');
  assert.equal(await page.$eval('#name-control', (element) => Reflect.get(element, '$').value), 'Alex');
  assert.equal(await page.$eval('#gallery-data', (element) => Reflect.get(element, '$').query), '');
  await sendStdin('update', 'widgets', JSON.stringify({ selector: '#gallery-data', values: {
    status: 'contacted', statusOptions: [{ value: 'contacted', label: 'Contacted' }, { value: 'new', label: 'New' }],
  } }));
  assert.equal(await page.$eval('#status-control select', (element) => element.value), 'contacted');
  assert.equal(await page.$eval('#status-mirror select', (element) => element.value), 'contacted');
  await cli('events', 'widgets');
  await page.click('#retry-state button');
  let events = (await cli('events', 'widgets')).events;
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].data, { widgetId: 'retry-state', context: null, action: 'retry' });
  let discovery = await cli('tools', 'widgets');
  let setToggle = discovery.tools.find((/** @type {{key: string, ownerName: string}} */ tool) => tool.key === 'set_value' && tool.ownerName === 'agui-toggle');
  assert.ok(setToggle);
  let toggleCall = { pageId: discovery.pageId, discoveryId: discovery.discoveryId, name: setToggle.name, input: { value: true } };
  assert.deepEqual((await sendStdin('call', 'widgets', JSON.stringify(toggleCall))).result, { value: true, changed: true });
  assert.equal(await page.$eval('#notifications-toggle input', (element) => element.checked), true);
  await cli('events', 'widgets');
  let setValue = discovery.tools.find((/** @type {{key: string, ownerName: string}} */ tool) => tool.key === 'set_value' && tool.ownerName === 'agui-field');
  assert.ok(setValue);
  let call = { pageId: discovery.pageId, discoveryId: discovery.discoveryId, name: setValue.name, input: { value: 'Grace' } };
  assert.deepEqual((await sendStdin('call', 'widgets', JSON.stringify(call))).result, { value: 'Grace', changed: true });
  assert.deepEqual((await sendStdin('call', 'widgets', JSON.stringify(call))).result, { value: 'Grace', changed: false });
  assert.equal((await cli('events', 'widgets')).events.length, 1);
  assert.equal(await page.$eval('#query-control input', (element) => element.value), 'Grace');
  await sendStdin('update', 'widgets', JSON.stringify({ selector: '#query-control', method: 'add$', values: { readonly: true }, rewrite: true }));
  await assert.rejects(sendStdin('call', 'widgets', JSON.stringify({ ...call, input: { value: 'Blocked' } })));
  assert.equal(await page.$eval('#query-control input', (element) => element.value), 'Grace');
  await sendStdin('update', 'widgets', JSON.stringify({ selector: '#gallery-data', values: { componentState: { status: 'ready' } } }));
  assert.equal(await page.$eval('#retry-state > div', (element) => element.hidden), true);
  await page.setViewport({ width: 390, height: 844 });
  await page.setViewport({ width: 1280, height: 900 });
  await page.$eval('#query-control', (element) => { Reflect.set(window, 'oldField', element); });
  await insertStdin('widgets', html);
  await page.waitForFunction(() => Reflect.get(window, 'oldField').allSubs.size === 0);
  assert.equal(await page.evaluate(() => document.adoptedStyleSheets.length), styleCount);
  assert.equal(await page.$eval('#query-control input', (element) => element.value), '');
  await insertStdin('widgets', [
    '<context-provider id="binding-data" ctx="binding-test"><script type="application/json">',
    '{"nameLabel":"Dynamic name","dynamicValue":"Bound","fieldState":{"label":"From state","value":"State value","disabled":true}}',
    '</script>',
    '<agui-field id="inner-field" label="Inner" value="Inner"></agui-field>',
    '<agui-field id="outer-field" label="Outer" value="Outer"></agui-field>',
    '<agui-field id="bound-field" ctx="binding-test" bind="$.label: *nameLabel; $.value: *dynamicValue"></agui-field>',
    '<agui-field id="state-field" bind="state: binding-test/fieldState"></agui-field>',
    '</context-provider>',
    '<input id="native-input" aria-label="Native input">',
  ].join('\n'));
  assert.equal(await page.$eval('#inner-field input', (element) => element.value), 'Inner');
  assert.equal(await page.$eval('#outer-field input', (element) => element.value), 'Outer');
  await page.focus('#inner-field input');
  await page.keyboard.press('End');
  await page.type('#inner-field input', ' changed');
  assert.equal(await page.$eval('#inner-field input', (element) => element.value), 'Inner changed');
  assert.equal(await page.$eval('#outer-field input', (element) => element.value), 'Outer');
  assert.equal(await page.$eval('#bound-field label span span', (element) => element.textContent), 'Dynamic name');
  assert.equal(await page.$eval('#bound-field input', (element) => element.value), 'Bound');
  assert.equal(await page.$eval('#state-field input', (element) => element.value), 'State value');
  assert.equal(await page.$eval('#state-field input', (element) => element.disabled), true);
  await sendStdin('update', 'widgets', JSON.stringify({ selector: '#binding-data', values: {
    nameLabel: 'Updated label', dynamicValue: 'Updated value', fieldState: { label: 'Updated state', value: 'Enabled', disabled: false },
  } }));
  assert.equal(await page.$eval('#bound-field label span span', (element) => element.textContent), 'Updated label');
  assert.equal(await page.$eval('#bound-field input', (element) => element.value), 'Updated value');
  assert.equal(await page.$eval('#state-field input', (element) => element.value), 'Enabled');
  assert.equal(await page.$eval('#state-field input', (element) => element.disabled), false);
  assert.deepEqual(errors, []);
});
