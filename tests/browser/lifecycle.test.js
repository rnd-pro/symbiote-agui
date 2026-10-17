import assert from 'node:assert/strict';
import { readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { isProcessAlive, readSession } from '../../src/sessions/store.js';
import { temporaryState } from '../node/state-fixture.js';
import { cli, hasCliError, insertStdin, sendStdin, waitForSession } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('regular pages receive markup independently and remain open after stop', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    for (let id of ['demo', 'Demo']) { await cli('stop', id).catch(() => {}); }
    await browser?.close();
    await state.close();
  });
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10_000, protocolTimeout: 10_000 });
  let first = await cli('start', 'demo', '--no-open');
  let second = await cli('start', 'Demo', '--no-open');
  assert.equal(first.state, 'waiting');
  assert.equal(second.state, 'waiting');
  assert.equal(first.clients, 0);
  assert.equal(first.cdpUrl, undefined);
  assert.notEqual(first.url, second.url);
  assert.equal(new URL(first.url).pathname, '/demo/');
  assert.equal(new URL(first.url).hash, '');
  assert.equal((await cli('status', 'demo')).url, first.url);
  await assert.rejects(cli('start', 'demo', '--no-open'), (error) => hasCliError(error, 'SESSION_EXISTS'));
  let record = await readSession('demo');
  assert.ok(record);
  let file = join(state.directory, 'view with spaces.html');
  await writeFile(file, [
    '<section class="grid grid-cols-1 md:grid-cols-2 p-4">',
    '<h1>First café $&</h1>',
    '<button class="w-[123px] bg-blue-600 hover:bg-red-600">Check</button>',
    '<template><p class="p-8">Later</p></template>',
    '<script>window.insertedScriptRan = true;</script>',
    '</section>',
  ].join('\n'));
  let queued = await cli('insert', 'demo', '--file', relative(process.cwd(), file));
  assert.equal(queued.delivery, 'queued');
  await insertStdin('Demo', '<h1>Independent session</h1>');
  let firstPage = await browser.newPage();
  let secondPage = await browser.newPage();
  await firstPage.setViewport({ width: 900, height: 700 });
  let isolated = await browser.createBrowserContext();
  let anotherBrowser = await isolated.newPage();
  await anotherBrowser.goto(first.url);
  await anotherBrowser.waitForFunction(() => document.querySelector('h1')?.textContent === 'First café $&');
  assert.equal((await cli('status', 'demo')).clients, 1);
  await firstPage.goto(first.url);
  await secondPage.goto(second.url);
  await firstPage.waitForSelector('h1');
  await firstPage.waitForFunction(() => document.querySelector('h1')?.textContent === 'First café $&');
  await secondPage.waitForFunction(() => document.querySelector('h1')?.textContent === 'Independent session');
  assert.equal(firstPage.url(), first.url);
  assert.equal(secondPage.url(), second.url);
  assert.equal(await firstPage.evaluate(() => document.cookie), '');
  assert.equal(anotherBrowser.url(), first.url);
  await isolated.close();
  assert.equal((await waitForSession('demo', 'ready')).clients, 1);
  await firstPage.bringToFront();
  assert.equal(await firstPage.$eval('button', (element) => getComputedStyle(element).width), '123px');
  assert.equal(await firstPage.$eval('section', (element) => getComputedStyle(element).padding), '16px');
  assert.equal(await firstPage.$eval('section', (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length), 2);
  assert.equal(await firstPage.evaluate(() => Reflect.get(window, 'insertedScriptRan')), undefined);
  assert.match(await (await fetch(new URL('/styles.css.js', first.url))).text(), /\.p-8/);
  let background = await firstPage.$eval('button', (element) => getComputedStyle(element).backgroundColor);
  await firstPage.hover('button');
  assert.notEqual(await firstPage.$eval('button', (element) => getComputedStyle(element).backgroundColor), background);
  let replacement = '<details open class="p-8"><summary>Next</summary><p>Replacement</p></details>';
  assert.equal((await insertStdin('demo', replacement)).delivery, 'applied');
  await firstPage.click('summary');
  assert.equal(await firstPage.$eval('details', (element) => element.open), false);
  await assert.rejects(insertStdin('demo', '<agui-component><script type="text/json">{broken}</script></agui-component>'), (error) => hasCliError(error, 'INSERT_FAILED'));
  assert.equal(await firstPage.$eval('details', (element) => element.open), false);
  await firstPage.reload();
  await firstPage.waitForSelector('details');
  assert.equal(await firstPage.$eval('details', (element) => element.open), true);
  assert.equal(await secondPage.$eval('h1', (element) => element.textContent), 'Independent session');
  await insertStdin('demo', '');
  assert.equal(await firstPage.$eval('main', (element) => element.childElementCount), 0);
  assert.equal((await cli('stop', 'demo')).state, 'stopped');
  assert.equal(firstPage.isClosed(), false);
  await firstPage.waitForFunction(() => document.getElementById('agui-connection')?.textContent === 'Session ended.');
  assert.equal((await cli('status', 'Demo')).state, 'ready');
  await secondPage.close();
  await waitForSession('Demo', 'waiting');
  await assert.rejects(sendStdin('update', 'Demo', '{"selector":"#missing","values":{}}'), (error) => hasCliError(error, 'PAGE_UNAVAILABLE'));
  assert.equal((await cli('stop', 'Demo')).state, 'stopped');
  assert.equal((await cli('stop', 'demo')).state, 'stopped');
  for (let attempt = 0; attempt < 100 && isProcessAlive(record.pid); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(isProcessAlive(record.pid), false);
  let restarted = await cli('start', 'demo', '--no-open');
  assert.equal(new URL(restarted.url).pathname, '/demo/');
  await firstPage.goto(restarted.url);
  await waitForSession('demo', 'ready');
  assert.equal(firstPage.url(), restarted.url);
  await cli('stop', 'demo');
  assert.deepEqual(await readdir(state.directory), ['.cache', 'view with spaces.html']);
  assert.equal(browser.connected, true);
});

test('inline modules, state commands, events, reload, and reconnect work in ordinary tabs', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await cli('stop', 'interactive').catch(() => {});
    await browser?.close();
    await state.close();
  });
  browser = await puppeteer.launch({ executablePath, headless: true, timeout: 10_000, protocolTimeout: 10_000 });
  let session = await cli('start', 'interactive', '--no-open');
  let markup = [
    '<template id="counter-template"><button bind="onclick: increment">Count: {{count}}</button></template>',
    '<module-counter id="counter" use-template="#counter-template"><script type="application/json">{"count":0,"increment":null}</script></module-counter>',
    '<script type="module" data-agui>',
    'let { AguiComponent } = await import(new URL("/client/index.js", location.href).href);',
    'if (!customElements.get("module-counter")) { class ModuleCounter extends AguiComponent { moduleRegistered = true; } ModuleCounter.reg("module-counter"); }',
    'export default (root, { emit }) => {',
    '  let counter = root.querySelector("#counter");',
    '  counter.set$({ increment: () => { counter.$.count += 1; emit("count", { count: counter.$.count }); } });',
    '  return () => { window.moduleDisposed = true; };',
    '};',
    '</script>',
  ].join('\n');
  await insertStdin('interactive', markup);
  let page = await browser.newPage();
  await page.goto(session.url);
  await page.waitForSelector('button');
  assert.equal(await page.$eval('#counter', (element) => Reflect.get(element, 'moduleRegistered')), true);
  await page.waitForFunction(() => {
    let counter = document.querySelector('#counter');
    return counter && typeof Reflect.get(counter, '$')?.increment === 'function';
  });
  await page.click('button');
  assert.match(await page.$eval('button', (element) => element.textContent || ''), /Count: 1/);
  let events = await cli('events', 'interactive');
  assert.equal(events.events.length, 1);
  assert.equal(events.events[0].name, 'count');
  assert.deepEqual(events.events[0].data, { count: 1 });
  assert.deepEqual((await cli('events', 'interactive')).events, []);
  await sendStdin('update', 'interactive', '{"selector":"#counter","values":{"count":10}}');
  assert.match(await page.$eval('button', (element) => element.textContent || ''), /Count: 10/);
  await sendStdin('update', 'interactive', '{"selector":"#counter","values":{"newField":42},"method":"add$"}');
  assert.equal(await page.$eval('#counter', (element) => Reflect.get(element, '$').newField), 42);
  await assert.rejects(sendStdin('update', 'interactive', '{"selector":"#missing","values":{}}'), (error) => hasCliError(error, 'UPDATE_FAILED'));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await waitForSession('interactive', 'waiting');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await page.waitForFunction(() => document.querySelector('button')?.textContent === 'Count: 0');
  await waitForSession('interactive', 'ready');
  await page.goto('about:blank');
  await waitForSession('interactive', 'waiting');
  await insertStdin('interactive', '<script type="module" data-agui>throw new Error("Broken module");</script>');
  await page.goto(session.url);
  await page.waitForFunction(() => document.getElementById('agui-connection')?.textContent?.includes('Broken module'));
  let failures = /** @type {import('../../types/transport.js').EventBatch} */ (await cli('events', 'interactive'));
  assert.equal(failures.events[0]?.name, 'agui:error');
  assert.deepEqual(failures.events[0]?.data, { message: 'Broken module' });
  await insertStdin('interactive', markup);
  let another = await browser.newPage();
  await another.goto(session.url);
  await another.waitForSelector('button');
  assert.equal((await cli('status', 'interactive')).clients, 2);
  await sendStdin('update', 'interactive', '{"selector":"#counter","values":{"count":7}}');
  for (let tab of [page, another]) {
    assert.equal(await tab.$eval('button', (element) => element.textContent), 'Count: 7');
  }
  await page.bringToFront();
  await page.reload();
  await page.waitForFunction(() => document.querySelector('button')?.textContent === 'Count: 0');
  await insertStdin('interactive', '<p>Replacement</p>');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'moduleDisposed')), true);
  await cli('stop', 'interactive');
  assert.equal(page.isClosed(), false);
  assert.equal(another.isClosed(), false);
});
