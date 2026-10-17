import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, cliToolCall, insertStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

for (let native of [false, true]) {
  test(`Itemize skill example exposes individual checkbox tools with native WebMCP ${native ? 'enabled' : 'disabled'}`, {
    skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
    timeout: 30_000,
  }, async (t) => {
    let state = await temporaryState();
    let sessionId = 'itemize';
    /** @type {import('puppeteer-core').Browser | undefined} */
    let browser;
    t.after(async () => {
      await cli('stop', sessionId).catch(() => {});
      await browser?.close();
      await state.close();
    });
    let skill = await readFile(new URL('../../skills/symbiote-agui/SKILL.md', import.meta.url), 'utf8');
    let example = skill.match(/```html\n(<task-list>[\s\S]+?)\n```/);
    assert.ok(example, 'The public Itemize example must be runnable markup.');
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [native ? '--enable-blink-features=WebMCPTesting' : '--disable-blink-features=WebMCP,WebMCPTesting'],
    });
    let session = await cli('start', sessionId, '--no-open');
    let page = await browser.newPage();
    /** @type {string[]} */
    let errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(session.url);
    await insertStdin(sessionId, example[1]);
    await page.waitForSelector('task-row input');
    assert.equal(await page.evaluate(() => typeof Reflect.get(document, 'modelContext')?.registerTool === 'function'), native);
    let discovery = await cli('tools', sessionId);
    let names = ['toggle_in_task-row_brief', 'toggle_in_task-row_preview'];
    assert.deepEqual(discovery.tools.map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.name).sort(), names);
    assert.equal(discovery.tools.every((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.nativeActive === native), true);
    assert.equal(new Set(discovery.tools.map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerId)).size, 2);
    if (native) {
      assert.deepEqual(await page.evaluate(async () => {
        let context = Reflect.get(document, 'modelContext');
        return (await context.getTools()).map((/** @type {{ name: string }} */ tool) => tool.name).sort();
      }), names);
    }
    let call = {
      sessionId,
      pageId: discovery.pageId,
      discoveryId: discovery.discoveryId,
      name: names[0],
      input: {},
    };
    let result = await cliToolCall('call_tool', call);
    assert.equal(result.isError, false);
    assert.match(JSON.stringify(result.data.result), /checked/);
    assert.deepEqual(await page.$$eval('input', (inputs) => inputs.map((input) => input.checked)), [true, false]);
    await page.click('task-row:last-child input');
    assert.deepEqual(await page.$$eval('input', (inputs) => inputs.map((input) => input.checked)), [true, true]);
    discovery = await cli('tools', sessionId);
    call.discoveryId = discovery.discoveryId;
    assert.equal((await cliToolCall('call_tool', call)).isError, false);
    assert.deepEqual(await page.$$eval('input', (inputs) => inputs.map((input) => input.checked)), [false, true]);
    await cli('clear', sessionId);
    assert.deepEqual((await cli('tools', sessionId)).tools, []);
    assert.equal(await page.$('task-row'), null);
    assert.deepEqual(errors, []);
  });
}
