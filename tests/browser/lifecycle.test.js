import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
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
  await assert.rejects(cli('start', 'demo', '--cdp-url', endpoint), (error) => {
    let failure = /** @type {Error & { stdout: string }} */ (error);
    return JSON.parse(failure.stdout).error.code === 'SESSION_EXISTS';
  });
  let firstPage = (await browser.pages()).find((page) => page.url() === first.url);
  let secondPage = (await browser.pages()).find((page) => page.url() === second.url);
  assert.ok(firstPage);
  assert.ok(secondPage);
  assert.ok(await firstPage.$('#agui-content'));
  assert.equal((await cli('stop', 'demo')).state, 'stopped');
  assert.equal(firstPage.isClosed(), true);
  assert.equal((await cli('status', 'Demo')).state, 'ready');
  assert.equal(unrelated.isClosed(), false);
  await secondPage.close();
  assert.equal((await cli('status', 'Demo')).state, 'disconnected');
  assert.equal((await cli('stop', 'Demo')).state, 'stopped');
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
