import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { connectMcp, mcpCall } from '../node/mcp-client.js';
import { cli, insertStdin, sendStdin, waitForSession } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;
let markup = [
  '<task-desk><input type="checkbox"><input type="checkbox"><input type="checkbox"><output>{{checked}} / 3</output></task-desk>',
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

test('MCP invokes one ordinary page through the worker and WebSocket with validation and stale-call protection', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let browser = await puppeteer.launch({
    executablePath, headless: true, args: ['--disable-blink-features=WebMCP,WebMCPTesting'],
  });
  t.after(() => browser.close());
  let client = await connectMcp();
  t.after(() => client.close());
  let sessionId = 'mcp-desk';
  t.after(() => cli('stop', sessionId).catch(() => {}));
  let session = await cli('start', sessionId, '--no-open');
  assert.deepEqual((await mcpCall(client, 'list_pages', { sessionId })).data.pages, []);
  assert.equal((await mcpCall(client, 'list_tools', { sessionId })).data.error.code, 'PAGE_UNAVAILABLE');
  await insertStdin(sessionId, markup);
  let first = await browser.newPage();
  await first.goto(session.authorizationUrl);
  await waitForSession(sessionId, 'ready');
  let discovery = await mcpCall(client, 'list_tools', { sessionId });
  assert.equal(discovery.isError, false);
  assert.equal(await first.evaluate(() => typeof Reflect.get(document, 'modelContext')), 'undefined');
  assert.equal(discovery.data.tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.name === 'complete_all_in_task-desk'), true);
  let second = await browser.newPage();
  await second.goto(session.url);
  await second.waitForSelector('task-desk output');
  let pages = (await mcpCall(client, 'list_pages', { sessionId })).data.pages;
  assert.equal(pages.length, 2);
  assert.equal(pages.every((/** @type {import('../../types/tools.js').ConnectedPage} */ page) => page.ready && page.url === session.url), true);
  assert.equal((await mcpCall(client, 'list_tools', { sessionId })).data.error.code, 'PAGE_AMBIGUOUS');
  let call = { sessionId, pageId: discovery.data.pageId, discoveryId: discovery.data.discoveryId, name: 'complete_all_in_task-desk', input: {} };
  assert.equal((await mcpCall(client, 'call_tool', call)).isError, true);
  assert.equal(await first.$$eval('input', (inputs) => inputs.some((input) => input.checked)), false);
  call.input = /** @type {Record<string, unknown>} */ ({ confirm: true });
  let result = await mcpCall(client, 'call_tool', call);
  assert.equal(result.isError, false);
  assert.deepEqual(result.data.result, { checked: 3, total: 3 });
  assert.equal(await first.$$eval('input', (inputs) => inputs.every((input) => input.checked)), true);
  assert.equal(await second.$$eval('input', (inputs) => inputs.some((input) => input.checked)), false);
  assert.equal(await first.$eval('output', (output) => output.textContent), '3 / 3');
  assert.deepEqual((await mcpCall(client, 'call_tool', call)).data.result, { checked: 3, total: 3 });
  let events = await cli('events', sessionId);
  assert.deepEqual(events.events.map((/** @type {import('../../types/transport.js').SessionEvent} */ event) => event.data), [{ checked: 3 }]);
  let failed = await mcpCall(client, 'call_tool', { ...call, name: 'fail_in_task-desk', input: {} });
  assert.equal(failed.isError, true);
  assert.match(JSON.stringify(failed.data.result), /Expected invocation failure/);

  await sendStdin('update', sessionId, '{"selector":"task-desk","values":{"enabled":false}}');
  assert.equal((await mcpCall(client, 'call_tool', call)).isError, true);
  await sendStdin('update', sessionId, '{"selector":"task-desk","values":{"enabled":true}}');
  discovery = await mcpCall(client, 'list_tools', { sessionId, pageId: call.pageId });
  call.discoveryId = discovery.data.discoveryId;
  await insertStdin(sessionId, markup);
  assert.equal((await mcpCall(client, 'call_tool', call)).isError, true);
  assert.equal(await first.$$eval('input', (inputs) => inputs.some((input) => input.checked)), false);
  discovery = await mcpCall(client, 'list_tools', { sessionId, pageId: call.pageId });
  call.discoveryId = discovery.data.discoveryId;
  await first.reload();
  await first.waitForSelector('task-desk output');
  assert.equal((await mcpCall(client, 'call_tool', call)).data.error.code, 'PAGE_UNAVAILABLE');
  await first.close();
  await second.close();
  await waitForSession(sessionId, 'waiting');
  assert.equal((await mcpCall(client, 'call_tool', call)).isError, true);
  await cli('stop', sessionId);
  assert.equal((await mcpCall(client, 'list_tools', { sessionId })).data.error.code, 'SESSION_STOPPED');
});
