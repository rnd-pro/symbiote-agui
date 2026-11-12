import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

test('inactive sidebar blocks preserve drafts, disable controls and move focus out of hidden content', {
  timeout: 60000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await cli('stop', 'sidebar-block').catch(() => {});
    await state.close();
  });
  let session = await cli('start', 'sidebar-block', '--no-open');
  await insertStdin('sidebar-block', `
    <context-provider ctx="BLOCK">
      <script type="application/json">
        {
          "active": true,
          "sidebarExpanded": true,
          "label": "Item controls",
          "note": "Initial draft"
        }
      </script>
      <agui-sidebar label="Controls" expand-label="Expand" collapse-label="Collapse"
        bind="$.value: BLOCK/sidebarExpanded">
        <agui-sidebar-block label="Fallback label" bind="$.label: BLOCK/label; $.active: BLOCK/active">
          <agui-field id="draft" label="Draft" pub-to="BLOCK/note" bind="$.value: BLOCK/note"></agui-field>
          <agui-field id="locked" label="Locked" disabled value="Unchanged"></agui-field>
        </agui-sidebar-block>
      </agui-sidebar>
    </context-provider>
  `);
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('#draft input');
  await page.waitForFunction(() => document.querySelector('agui-sidebar-block legend')?.textContent === 'Item controls');
  let input = await page.$('#draft input');
  assert.ok(input);
  await page.focus('#draft input');
  await page.keyboard.type(' edited');
  let value = await page.$eval('#draft input', (control) => control.value);
  await page.$eval('context-provider', (owner) => {
    /** @type {import('../../src/uilib/context-provider.js').ContextProvider} */ (owner).$ = {
      active: false,
      label: 'Selected item',
    };
  });
  assert.deepEqual(await page.$eval('agui-sidebar-block', (block) => {
    let content = block.querySelector('fieldset > div');
    let group = block.querySelector('fieldset');
    let heading = block.querySelector('legend');
    if (!content || !group || !heading) { throw new Error('The fixture did not mount.'); }
    return {
      hidden: content.hasAttribute('hidden'),
      inert: content.hasAttribute('inert'),
      disabled: group.disabled,
      focusedLabel: document.activeElement === heading,
      label: heading.textContent,
    };
  }), {
    hidden: true,
    inert: true,
    disabled: true,
    focusedLabel: true,
    label: 'Selected item',
  });
  assert.equal(await page.$eval('#draft input', (control) => control.matches(':disabled')), true);
  assert.equal(await page.$eval('#draft', (field) => {
    try {
      /** @type {import('../../src/uilib/controls/field/field.js').Field} */ (field).commit('Blocked');
      return false;
    } catch { return true; }
  }), true);
  await page.$eval('context-provider', (owner) => {
    /** @type {import('../../src/uilib/context-provider.js').ContextProvider} */ (owner).$.active = true;
  });
  assert.equal(await input.evaluate((control) => control === document.querySelector('#draft input')), true);
  assert.equal(await page.$eval('#draft input', (control) => control.value), value);
  assert.equal(await page.$eval('#draft input', (control) => control.matches(':disabled')), false);
  assert.equal(await page.$eval('#locked input', (control) => control.matches(':disabled')), true);
  await page.$eval('agui-sidebar-block', (block) => {
    block.setAttribute('active', 'false');
  });
  assert.equal(await page.$eval('agui-sidebar-block fieldset', (group) => group.disabled), false);
  await page.$eval('agui-sidebar-block', (block) => {
    /** @type {import('../../src/uilib/layouts/sidebar-block/sidebar-block.js').SidebarBlock} */ (block).$.active = undefined;
  });
  assert.equal(await page.$eval('agui-sidebar-block fieldset', (group) => group.disabled), true);
  await page.$eval('agui-sidebar-block', (block) => block.removeAttribute('active'));
  assert.equal(await page.$eval('agui-sidebar-block fieldset', (group) => group.disabled), false);
  assert.equal(await page.$('agui-sidebar-block slot'), null);
  assert.deepEqual(errors, []);
});
