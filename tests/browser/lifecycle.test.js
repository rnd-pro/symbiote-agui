import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import puppeteer from 'puppeteer-core';
import { closeBrowser } from '../../src/browser/cleanup.js';
import { temporaryState } from '../node/state-fixture.js';

let execute = promisify(execFile);
let executablePath = process.env.AGUI_TEST_BROWSER_PATH;
let cliPath = fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url));

/** @param {string[]} args */
async function cli(...args) {
  let { stdout } = await execute(process.execPath, [cliPath, ...args], { timeout: 45_000 });
  return JSON.parse(stdout);
}

/**
 * @param {string} sessionId
 * @param {string} html
 */
async function insertStdin(sessionId, html) {
  let stdout = await new Promise((resolve, reject) => {
    let child = execFile(process.execPath, [cliPath, 'insert', sessionId], { timeout: 45_000 }, (error, output) => {
      error ? reject(Object.assign(error, { stdout: output })) : resolve(output);
    });
    child.stdin?.end(html);
  });
  return JSON.parse(stdout);
}

/**
 * @param {unknown} error
 * @param {string} code
 */
function hasCliError(error, code) {
  let failure = /** @type {Error & { stdout: string }} */ (error);
  return JSON.parse(failure.stdout).error.code === code;
}

test('CLI sessions survive launcher exit and preserve an attached browser', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 90_000,
}, async (t) => {
  let state = await temporaryState();
  let browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir: join(state.directory, 'external-browser'),
  });
  t.after(async () => {
    for (let id of ['demo', 'Demo']) {
      await cli('stop', id).catch(() => {});
    }
    await browser.close();
    await state.close();
  });
  let unrelated = await browser.newPage();
  let endpoint = browser.wsEndpoint();
  let [first, second] = await Promise.all([
    cli('start', 'demo', '--cdp-url', endpoint),
    cli('start', 'Demo', '--cdp-url', endpoint),
  ]);
  assert.equal(first.state, 'ready');
  assert.equal(second.state, 'ready');
  assert.notEqual(first.url, second.url);
  assert.equal((await cli('status', 'demo')).cdpUrl, endpoint);
  await assert.rejects(cli('start', 'demo', '--cdp-url', endpoint), (error) => hasCliError(error, 'SESSION_EXISTS'));
  let firstPage = (await browser.pages()).find((page) => page.url() === first.url);
  let secondPage = (await browser.pages()).find((page) => page.url() === second.url);
  assert.ok(firstPage);
  assert.ok(secondPage);
  assert.ok(await firstPage.$('#agui-content'));
  let file = join(state.directory, 'view with spaces.html');
  await writeFile(file, [
    '<section class="grid grid-cols-1 md:grid-cols-2 p-4">',
    '<h1>First café $&</h1>',
    '<button class="w-[123px] bg-blue-600 hover:bg-red-600">Check</button>',
    '<template><p class="p-8">Later</p></template>',
    '<script>window.insertedScriptRan = true;</script>',
    '</section>',
  ].join('\n'));
  await firstPage.setViewport({ width: 900, height: 700 });
  await firstPage.evaluate(() => Reflect.set(window, 'originalRoot', document.getElementById('agui-content')));
  assert.equal((await cli('insert', 'demo', '--file', relative(process.cwd(), file))).state, 'ready');
  assert.equal(await firstPage.$eval('h1', (element) => element.textContent), 'First café $&');
  assert.equal(await firstPage.$eval('button', (element) => getComputedStyle(element).width), '123px');
  assert.equal(await firstPage.$eval('section', (element) => getComputedStyle(element).padding), '16px');
  assert.equal(await firstPage.$eval('section', (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length), 2);
  assert.equal(await firstPage.evaluate(() => Reflect.get(window, 'insertedScriptRan')), undefined);
  assert.match(await (await fetch(new URL('/styles.css.js', first.url))).text(), /\.p-8/);
  let background = await firstPage.$eval('button', (element) => getComputedStyle(element).backgroundColor);
  await firstPage.hover('button');
  assert.notEqual(await firstPage.$eval('button', (element) => getComputedStyle(element).backgroundColor), background);
  assert.match(await secondPage.$eval('main', (element) => element.textContent || ''), /Waiting/);
  assert.equal((await insertStdin('demo', '<details open class="p-8"><summary>Next</summary><p>Replacement</p></details>')).state, 'ready');
  assert.equal(await firstPage.$('h1'), null);
  assert.equal(await firstPage.$eval('details', (element) => getComputedStyle(element).padding), '32px');
  assert.equal(await firstPage.evaluate(() => document.getElementById('agui-content') === Reflect.get(window, 'originalRoot')), true);
  await firstPage.click('summary');
  assert.equal(await firstPage.$eval('details', (element) => element.open), false);
  await assert.rejects(cli('insert', 'demo', '--file', `${file}.missing`), (error) => hasCliError(error, 'INVALID_INPUT'));
  await firstPage.setOfflineMode(true);
  await assert.rejects(insertStdin('demo', '<p>Failed replacement</p>'), (error) => hasCliError(error, 'INSERT_FAILED'));
  assert.ok(await firstPage.$('details'));
  await firstPage.setOfflineMode(false);
  assert.equal((await insertStdin('demo', '')).state, 'ready');
  assert.equal(await firstPage.$eval('main', (element) => element.childElementCount), 0);
  assert.equal((await cli('stop', 'demo')).state, 'stopped');
  assert.equal(firstPage.isClosed(), true);
  assert.equal((await cli('status', 'Demo')).state, 'ready');
  assert.equal(unrelated.isClosed(), false);
  await secondPage.close();
  assert.equal((await cli('status', 'Demo')).state, 'disconnected');
  await assert.rejects(cli('insert', 'Demo', '--file', file), (error) => hasCliError(error, 'SESSION_DISCONNECTED'));
  assert.equal((await cli('stop', 'Demo')).state, 'stopped');
  await assert.rejects(cli('insert', 'Demo', '--file', file), (error) => hasCliError(error, 'SESSION_STOPPED'));
  assert.equal((await cli('stop', 'demo')).state, 'stopped');
  assert.equal((await cli('start', 'demo', '--cdp-url', endpoint)).state, 'ready');
  assert.equal(browser.connected, true);
  assert.equal(unrelated.isClosed(), false);
  await browser.close();
  assert.equal((await cli('status', 'demo')).state, 'disconnected');
  assert.equal((await cli('stop', 'demo')).state, 'stopped');
});

test('managed browser cleanup waits for its own Chrome process to exit', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 30_000,
}, async (t) => {
  let browser = await puppeteer.launch({ executablePath, headless: true });
  t.after(() => browser.close());
  let child = browser.process();
  assert.ok(child);
  await closeBrowser(browser, await browser.newPage(), true);
  assert.equal(browser.connected, false);
  assert.ok(child.exitCode !== null || child.signalCode !== null);
});
