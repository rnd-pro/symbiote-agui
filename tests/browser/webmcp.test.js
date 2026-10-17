import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { CLIENT_SCRIPT_PATH } from '../../src/markup/constants.js';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;
let markup = [
  '<webmcp-counter id="counter">',
  '<script type="application/json">{"count":0,"increment":null,"canSet":false}</script>',
  '<button bind="onclick: increment">Count: {{count}}</button>',
  '</webmcp-counter>',
  '<context-provider id="parent">',
  '<script type="text/json">{"count":0,"increment":null}</script>',
  '<agui-component><button id="parent-button" bind="onclick: ^increment">Parent: {{^count}}</button></agui-component>',
  '</context-provider>',
  '<template id="action-template"><button id="choose" bind="onclick: choose">Selected: {{selected}}</button></template>',
  '<action-card id="card" use-template="#action-template"><script type="application/json">{"selected":false,"choose":null}</script></action-card>',
  '<script type="module" data-agui>',
  'let { AguiComponent, ToolDescriptor, PubSub } = await import(new URL("/client/index.js", location.href).href);',
  'if (!customElements.get("webmcp-counter")) {',
  '  class WebMCPCounter extends AguiComponent {',
  '    componentDescription = "The visible test counter.";',
  '    init$ = { set_count: new ToolDescriptor({',
  '      name: "counter_set", description: "Set the visible counter value.",',
  '      deps: ["canSet"], when: () => this.$.canSet,',
  '      inputSchema: { type: "object", properties: { count: { type: "integer", description: "New count.", minimum: 0 } }, required: ["count"], additionalProperties: false },',
  '      execute: ({ count }) => { this.$.count = count; return { count }; },',
  '    }) };',
  '  }',
  '  WebMCPCounter.reg("webmcp-counter");',
  '}',
  'export default (root, { emit }) => {',
  '  let counter = root.querySelector("#counter");',
  '  counter.set$({ increment: () => { counter.$.count += 1; emit("count", { count: counter.$.count }); return counter.$.count; } });',
  '  let parent = root.querySelector("#parent");',
  '  parent.set$({ increment: () => { parent.$.count += 1; return parent.$.count; } });',
  '  let card = root.querySelector("#card");',
  '  card.set$({ choose: () => { card.$.selected = true; } });',
  '  PubSub.registerCtx({ read_count: new ToolDescriptor({',
  '    name: "context_read", description: "Read the visible counter through the context.",',
  '    annotations: { readOnlyHint: true }, execute: async () => { await Promise.resolve(); return { count: counter.$.count }; },',
  '  }), fail: new ToolDescriptor({',
  '    name: "context_fail", execute: async () => { throw new Error("Expected tool failure"); },',
  '  }) }, "WEBMCP_TEST");',
  '  return () => PubSub.deleteCtx("WEBMCP_TEST");',
  '};',
  '</script>',
].join('\n');

/**
 * @param {import('puppeteer-core').Page} page
 * @returns {Promise<import('@symbiotejs/symbiote/webmcp').WebMCPRegistryEntry[]>}
 */
async function registryTools(page) {
  return page.evaluate(async (path) => (await import(path)).listPageTools(), CLIENT_SCRIPT_PATH);
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} name
 * @param {Record<string, unknown>} [input]
 * @returns {Promise<unknown>}
 */
async function invokePageTool(page, name, input = {}) {
  return page.evaluate(async ({ path, name, input }) => (await import(path)).executePageTool(name, input), {
    path: CLIENT_SCRIPT_PATH,
    name,
    input,
  });
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} name
 * @param {Record<string, unknown>} [input]
 */
async function executeTool(page, name, input = {}) {
  return page.evaluate(async ({ name, input }) => {
    let context = /** @type {import('../../types/webmcp.js').NativeWebMCPContext} */ (Reflect.get(document, 'modelContext'));
    let tool = (await context.getTools()).find((entry) => entry.name === name);
    if (!tool) { throw new Error(`Native tool ${name} is unavailable.`); }
    return context.executeTool(tool, input);
  }, { name, input });
}

for (let native of [false, true]) {
  test(`Symbiote WebMCP tools and lifecycle with native API ${native ? 'enabled' : 'disabled'}`, {
    skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
    timeout: 60_000,
  }, async (t) => {
    let state = await temporaryState();
    /** @type {import('puppeteer-core').Browser | undefined} */
    let browser;
    t.after(async () => {
      await cli('stop', 'webmcp').catch(() => {});
      await browser?.close();
      await state.close();
    });
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [native ? '--enable-blink-features=WebMCPTesting' : '--disable-blink-features=WebMCP,WebMCPTesting'],
      timeout: 10_000,
      protocolTimeout: 10_000,
    });
    let session = await cli('start', 'webmcp', '--no-open');
    let page = await browser.newPage();
    /** @type {string[]} */
    let errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(session.url);
    assert.equal(await page.evaluate(() => typeof Reflect.get(document, 'modelContext')?.registerTool === 'function'), native,
      'Use Chrome with native WebMCP testing support for the enabled test.');
    await insertStdin('webmcp', markup);
    let tools = await registryTools(page);
    assert.ok(tools.some((tool) => tool.name === 'increment_in_webmcp-counter'));
    assert.ok(tools.some((tool) => tool.name === 'increment_in_context-provider_agui-component'));
    assert.equal(tools.filter((tool) => tool.name === 'context_read').length, 1);
    assert.ok(tools.some((tool) => tool.name === 'choose_in_action-card'));
    assert.equal(tools.some((tool) => tool.name === 'counter_set'), false);
    assert.equal(tools.every((tool) => tool.nativeActive === native), true);
    assert.equal(await page.$eval('#counter button', (element) => element.getAttribute('bind')), 'onclick: increment');

    if (native) {
      let discovered = await page.evaluate(async () => {
        let context = /** @type {import('../../types/webmcp.js').NativeWebMCPContext} */ (Reflect.get(document, 'modelContext'));
        return (await context.getTools()).map((tool) => tool.name);
      });
      assert.deepEqual(discovered.sort(), tools.map((tool) => tool.name).sort());
      await executeTool(page, 'increment_in_webmcp-counter');
      await executeTool(page, 'increment_in_context-provider_agui-component');
      await executeTool(page, 'choose_in_action-card');
    } else {
      await invokePageTool(page, 'increment_in_webmcp-counter');
      await invokePageTool(page, 'increment_in_context-provider_agui-component');
      await invokePageTool(page, 'choose_in_action-card');
    }
    assert.equal(await page.$eval('#counter button', (element) => element.textContent), 'Count: 1');
    assert.equal(await page.$eval('#parent-button', (element) => element.textContent), 'Parent: 1');
    assert.equal(await page.$eval('#choose', (element) => element.textContent), 'Selected: true');
    let events = await cli('events', 'webmcp');
    assert.deepEqual(events.events.map((/** @type {import('../../types/transport.js').SessionEvent} */ event) => event.data), [{ count: 1 }]);

    let incremented = await invokePageTool(page, 'increment_in_webmcp-counter');
    assert.match(JSON.stringify(incremented), /Response status - ok: 2/);
    assert.equal(await page.$eval('#counter button', (element) => element.textContent), 'Count: 2');
    assert.partialDeepStrictEqual(await invokePageTool(page, 'counter_set', { count: 9 }), { isError: true });
    assert.partialDeepStrictEqual(await invokePageTool(page, 'missing_tool'), { isError: true });
    let failure = await invokePageTool(page, 'context_fail');
    assert.partialDeepStrictEqual(failure, { isError: true });
    assert.match(JSON.stringify(failure), /Expected tool failure/);

    await sendStdin('update', 'webmcp', '{"selector":"#counter","values":{"canSet":true}}');
    let descriptor = (await registryTools(page)).find((tool) => tool.name === 'counter_set');
    assert.ok(descriptor);
    assert.match(descriptor.description, /The visible test counter/);
    assert.deepEqual(descriptor.inputSchema.required, ['count']);
    assert.deepEqual(descriptor.inputSchema.properties, { count: { type: 'integer', description: 'New count.', minimum: 0 } });
    if (native) {
      assert.deepEqual(JSON.parse(await executeTool(page, 'counter_set', { count: 12 })), { count: 12 });
      assert.deepEqual(JSON.parse(await executeTool(page, 'context_read')), { count: 12 });
      assert.equal(await page.$eval('#counter button', (element) => element.textContent), 'Count: 12');
    }
    assert.deepEqual(await invokePageTool(page, 'counter_set', { count: 14 }), { count: 14 });
    assert.deepEqual(await invokePageTool(page, 'context_read'), { count: 14 });
    assert.equal(await page.$eval('#counter button', (element) => element.textContent), 'Count: 14');
    await sendStdin('update', 'webmcp', '{"selector":"#counter","values":{"canSet":false}}');
    assert.equal((await registryTools(page)).some((tool) => tool.name === 'counter_set'), false);
    assert.partialDeepStrictEqual(await invokePageTool(page, 'counter_set', { count: 9 }), { isError: true });

    await insertStdin('webmcp', '<p>Replacement</p>');
    assert.deepEqual(await registryTools(page), []);
    assert.partialDeepStrictEqual(await invokePageTool(page, 'context_read'), { isError: true });
    if (native) {
      assert.equal(await page.evaluate(async () => (await Reflect.get(document, 'modelContext').getTools()).length), 0);
    }
    await insertStdin('webmcp', markup);
    assert.equal((await registryTools(page)).filter((tool) => tool.name === 'context_read').length, 1);
    await cli('stop', 'webmcp');
    await page.waitForFunction(() => document.getElementById('agui-content')?.childElementCount === 0);
    assert.equal(page.isClosed(), false);
    assert.deepEqual(await registryTools(page), []);
    assert.partialDeepStrictEqual(await invokePageTool(page, 'increment_in_webmcp-counter'), { isError: true });
    if (native) {
      assert.equal(await page.evaluate(async () => (await Reflect.get(document, 'modelContext').getTools()).length), 0);
    }
    assert.deepEqual(errors, []);
  });
}
