import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

test('HTML-only declarations and record actions compose with AGUI controls, tools and session saving', {
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  t.after(async () => {
    await browser.close();
    await cli('stop', 'foundation').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'foundation', '--no-open');
  await insertStdin('foundation', `
    <template id="task-template">
      <li><label><input type="checkbox" bind="checked: done; onchange: [item-toggle]done"><span>{{title}}</span></label>
        <button type="button" bind="onclick: [item-remove]">Delete</button>
      </li>
    </template>
    <sym-component reg="foundation-task" use-template="#task-template"></sym-component>
    <sym-context id="tasks" ctx="TASKS" persist="items">
      <script type="application/json">{"items":[{"id":"first","title":"First task","done":false}],"draft":{"title":"","done":false}}</script>
      <agui-app>
        <agui-viewport>
          <agui-header><h1>Tasks</h1></agui-header>
          <sym-context bind="$: TASKS/draft" pub-to="TASKS/draft">
            <form action-data="TASKS/draft" action-reset="TASKS/draft" bind="onsubmit: [append]TASKS/items">
              <agui-field label="Task title" required pub-to="^title" bind="$.value: ^title"></agui-field>
              <button type="submit">Add</button>
            </form>
          </sym-context>
          <sym-collection data="TASKS/items"><ul itemize="items" item-tag="foundation-task"></ul></sym-collection>
        </agui-viewport>
      </agui-app>
    </sym-context>
  `);
  let page = await browser.newPage();
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('foundation-task input');
  await page.locator('agui-field input').fill('Second task');
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelectorAll('foundation-task').length === 2);
  let discovery = await cli('tools', 'foundation');
  let action = await page.$eval('foundation-task input', (element) => element.getAttribute('bind')?.split(';')
    .find((binding) => binding.trim().startsWith('onchange:'))?.split(':')[1].trim());
  let tool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ entry) => entry.ownerName === 'foundation-task'
    && entry.key === `auto:${action}`);
  assert.ok(tool);
  await sendStdin('call', 'foundation', JSON.stringify({
    pageId: discovery.pageId,
    discoveryId: discovery.discoveryId,
    name: tool.name,
    input: {},
  }));
  assert.equal(await page.$eval('#tasks', (element) => Reflect.get(element, '$').items[0].done), true);
  await page.locator('foundation-task:last-child button').click();
  await page.waitForFunction(() => document.querySelectorAll('foundation-task').length === 1);
  let result = await page.evaluate(async () => {
    let {
      commitData,
    } = await import(new URL('/client/index.js', location.href).href);
    return commitData([
      {
        provider: 'TASKS',
        keys: [
          'items',
        ],
      },
    ]);
  });
  assert.equal(result.state, 'committed');
  await page.reload();
  await page.waitForSelector('foundation-task input');
  assert.equal(await page.$eval('foundation-task input', (element) => element.checked), true);
  assert.deepEqual(await page.$$eval('foundation-task span', (elements) => elements.map((element) => element.textContent)), [
    'First task',
  ]);
  await page.$eval('#tasks', (element) => {
    Reflect.set(element, '$', {
      mapped: '',
      remapped: '',
    });
    let radio = document.createElement('agui-field');
    radio.setAttribute('type', 'radio');
    radio.setAttribute('value', 'before');
    radio.setAttribute('pub-map', 'TASKS/mapped: value');
    Reflect.set(radio, '$', {
      value: 'before',
    });
    element.append(radio);
  });
  await page.waitForFunction(() => document.querySelector('agui-field[type="radio"] input:checked') !== null);
  await page.$eval('agui-field[type="radio"]', (element) => {
    element.setAttribute('pub-map', 'TASKS/remapped: value');
    Reflect.get(element, '$').value = 'after';
    element.setAttribute('value', 'after');
  });
  await page.waitForFunction(() => {
    let input = /** @type {HTMLInputElement | null} */ (document.querySelector('agui-field[type="radio"] input'));
    return input?.value === 'after' && input.checked;
  });
  assert.equal(await page.$eval('#tasks', (element) => Reflect.get(element, '$').mapped), 'before');
  assert.equal(await page.$eval('#tasks', (element) => Reflect.get(element, '$').remapped), 'after');
  assert.deepEqual(errors, []);
});
