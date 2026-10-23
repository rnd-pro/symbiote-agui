import assert from 'node:assert/strict';
import test from 'node:test';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { connectMcp, mcpCall } from '../node/mcp-client.js';
import { cli, cliToolCall, hasCliError, insertStdin, sendStdin, waitForSession } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;
let markup = [
  '<task-desk class="block w-[321px]"><input type="checkbox"><input type="checkbox"><input type="checkbox"><output>{{checked}} / 3</output></task-desk>',
  '<script type="module" data-agui>',
  'let { AguiComponent, ToolDescriptor, emit } = await import(new URL("/client/index.js", location.href).href);',
  'if (!customElements.get("task-desk")) {',
  '  class TaskDesk extends AguiComponent {',
  '    init$ = { checked: 0, enabled: true,',
  '      complete_all: new ToolDescriptor({',
  '        description: "Check every task on this desk. Repeating keeps all tasks checked.",',
  '        deps: ["enabled"], when: () => this.$.enabled,',
  '        inputSchema: { type: "object", properties: { confirm: { const: true } }, required: ["confirm"], additionalProperties: false },',
  '        execute: async () => {',
  '          await Promise.resolve();',
  '          let boxes = [...this.querySelectorAll("input")];',
  '          let changed = boxes.some((box) => !box.checked);',
  '          boxes.forEach((box) => { box.checked = true; });',
  '          this.$.checked = boxes.length;',
  '          if (changed) emit("completed", { checked: boxes.length });',
  '          return { checked: boxes.length, total: boxes.length };',
  '        },',
  '      }),',
  '      fail: new ToolDescriptor({ execute: async () => { throw new Error("Expected invocation failure"); } }),',
  '    };',
  '  }',
  '  TaskDesk.reg("task-desk");',
  '}',
  'export default async () => { await new Promise((resolve) => setTimeout(resolve, 50)); };',
  '</script>',
].join('\n');

for (let route of ['MCP', 'CLI']) {
  test(`${route} invokes one ordinary page through the worker and WebSocket with validation and stale-call protection`, {
    skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
    timeout: 60_000,
  }, async (t) => {
    let state = await temporaryState();
    let sessionId = 'mcp-desk';
    /** @type {import('puppeteer-core').Browser | undefined} */
    let browser;
    /** @type {Awaited<ReturnType<typeof connectMcp>> | undefined} */
    let client;
    t.after(async () => {
      await cli('stop', sessionId).catch(() => {});
      await client?.close();
      await browser?.close();
      await state.close();
    });
    browser = await puppeteer.launch({
      executablePath, headless: true, args: ['--disable-blink-features=WebMCP,WebMCPTesting'],
    });
    if (route === 'MCP') { client = await connectMcp(); }
    /**
     * @param {keyof typeof import('../../src/mcp/catalog.js').MCP_TOOLS} name
     * @param {import('../../types/tools.js').McpToolArguments} args
     */
    async function invoke(name, args) {
      if (route === 'CLI') { return cliToolCall(name, args); }
      assert.ok(client);
      return mcpCall(client, name, args);
    }
    let session = await cli('start', sessionId, '--no-open');
    assert.deepEqual((await invoke('list_pages', { sessionId })).data.pages, []);
    assert.equal((await invoke('list_tools', { sessionId })).data.error.code, 'PAGE_UNAVAILABLE');
    let file = join(state.directory, 'desk.html');
    await writeFile(file, markup);
    await cli('insert', sessionId, '--file', file);
    await unlink(file);
    let first = await browser.newPage();
    await first.goto(session.url);
    await waitForSession(sessionId, 'ready');
    let discovery = await invoke('list_tools', { sessionId });
    assert.equal(discovery.isError, false);
    assert.equal(await first.evaluate(() => typeof Reflect.get(document, 'modelContext')), 'undefined');
    assert.equal(discovery.data.tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.name === 'complete_all_in_task-desk'), true);
    let second = await browser.newPage();
    await second.goto(session.url);
    await second.waitForSelector('task-desk output');
    let pages = (await invoke('list_pages', { sessionId })).data.pages;
    assert.equal(pages.length, 2);
    assert.equal(pages.every((/** @type {import('../../types/tools.js').ConnectedPage} */ page) => page.ready && page.url === session.url), true);
    assert.equal((await invoke('list_tools', { sessionId })).data.error.code, 'PAGE_AMBIGUOUS');
    let call = { sessionId, pageId: discovery.data.pageId, discoveryId: discovery.data.discoveryId, name: 'complete_all_in_task-desk', input: {} };
    assert.equal((await invoke('call_tool', call)).isError, true);
    assert.equal(await first.$$eval('input', (inputs) => inputs.some((input) => input.checked)), false);
    call.input = /** @type {Record<string, unknown>} */ ({ confirm: true });
    let result = await invoke('call_tool', call);
    assert.equal(result.isError, false);
    assert.deepEqual(result.data.result, { checked: 3, total: 3 });
    assert.equal(await first.$$eval('input', (inputs) => inputs.every((input) => input.checked)), true);
    assert.equal(await second.$$eval('input', (inputs) => inputs.some((input) => input.checked)), false);
    assert.equal(await first.$eval('output', (output) => output.textContent), '3 / 3');
    assert.deepEqual((await invoke('call_tool', call)).data.result, { checked: 3, total: 3 });
    let events = await cli('events', sessionId);
    assert.deepEqual(events.events.map((/** @type {import('../../types/transport.js').SessionEvent} */ event) => event.data), [{ checked: 3 }]);
    let failed = await invoke('call_tool', { ...call, name: 'fail_in_task-desk', input: {} });
    assert.equal(failed.isError, true);
    assert.match(JSON.stringify(failed.data.result), /Expected invocation failure/);

    await sendStdin('update', sessionId, '{"selector":"task-desk","values":{"enabled":false}}');
    assert.equal((await invoke('call_tool', call)).isError, true);
    await sendStdin('update', sessionId, '{"selector":"task-desk","values":{"enabled":true}}');
    discovery = await invoke('list_tools', { sessionId, pageId: call.pageId });
    call.discoveryId = discovery.data.discoveryId;
    await insertStdin(sessionId, markup);
    assert.equal((await invoke('call_tool', call)).isError, true);
    assert.equal(await first.$$eval('input', (inputs) => inputs.some((input) => input.checked)), false);
    discovery = await invoke('list_tools', { sessionId, pageId: call.pageId });
    call.discoveryId = discovery.data.discoveryId;
    await first.reload();
    await first.waitForSelector('task-desk output');
    assert.equal((await invoke('call_tool', call)).data.error.code, 'PAGE_UNAVAILABLE');
    await first.close();
    let secondId = pages.find((/** @type {import('../../types/tools.js').ConnectedPage} */ page) => page.pageId !== call.pageId).pageId;
    let finalDiscovery = await invoke('list_tools', { sessionId, pageId: secondId });
    await invoke('call_tool', { ...call, pageId: secondId, discoveryId: finalDiscovery.data.discoveryId });
    assert.equal(await second.$eval('output', (output) => output.textContent), '3 / 3');
    await second.close();
    await waitForSession(sessionId, 'waiting');
    assert.equal((await invoke('call_tool', call)).isError, true);
    await cli('stop', sessionId);
    assert.equal((await invoke('list_tools', { sessionId })).data.error.code, 'SESSION_STOPPED');

    let restored = await cli('start', sessionId, '--no-open');
    assert.equal(restored.restored, true);
    let restoredPage = await browser.newPage();
    await restoredPage.goto(restored.url);
    await restoredPage.waitForSelector('task-desk output');
    assert.equal(await restoredPage.$eval('output', (output) => output.textContent), '0 / 3');
    assert.equal(await restoredPage.$$eval('input', (inputs) => inputs.some((input) => input.checked)), false);
    assert.equal(await restoredPage.$eval('task-desk', (element) => getComputedStyle(element).width), '321px');
    let restoredTools = await invoke('list_tools', { sessionId });
    let restoredCall = { ...call, pageId: restoredTools.data.pageId, discoveryId: restoredTools.data.discoveryId };
    assert.deepEqual((await invoke('call_tool', restoredCall)).data.result, { checked: 3, total: 3 });
    await assert.rejects(insertStdin(sessionId, '<script type="module" data-agui>throw new Error("Rejected module");</script>'), (error) => hasCliError(error, 'INSERT_FAILED'));
    await cli('stop', sessionId);
    restored = await cli('start', sessionId, '--no-open');
    await restoredPage.goto(restored.url);
    await restoredPage.waitForSelector('task-desk output');
    assert.equal(await restoredPage.$eval('output', (output) => output.textContent), '0 / 3');
    assert.equal((await cli('clear', sessionId)).cleared, true);
    assert.equal(await restoredPage.$('task-desk'), null);
    assert.equal((await invoke('list_tools', { sessionId })).data.tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'task-desk'), false);
    await cli('stop', sessionId);
    assert.equal((await cli('start', sessionId, '--no-open')).restored, false);
  });
}
