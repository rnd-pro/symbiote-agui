import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { tunnelFixture } from '../node/tunnel-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('app sidebars publish explicit edits, preserve children, and mirror without active widgets', {
  skip: !executablePath || process.platform === 'win32' ? 'Requires Chrome and the POSIX connector fixture.' : false,
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let fixture = await tunnelFixture(state.directory);
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await cli('stop', 'app-layout').catch(() => {});
    await browser?.close();
    fixture.close();
    await state.close();
  });
  let session = await cli('start', 'app-layout', '--no-open');
  await insertStdin('app-layout', `
    <context-provider id="app" ctx="LAYOUT">
      <script type="application/json">{"open":true,"other":false,"title":"Navigation","draft":"Original"}</script>
      <agui-app>
        <agui-header><h1>Workspace</h1></agui-header>
        <agui-sidebar id="navigation" expand-label="Show navigation" collapse-label="Hide navigation"
          pub-to="LAYOUT/open" bind="$.value: LAYOUT/open; $.label: LAYOUT/title">
          <agui-field id="draft" label="Draft" pub-to="LAYOUT/draft" bind="$.value: LAYOUT/draft"></agui-field>
          <p id="sidebar-title">{{LAYOUT/title}}</p>
        </agui-sidebar>
        <agui-viewport id="viewport" aria-label="Records">
          <agui-header floating><h2>Records</h2></agui-header>
          <agui-dashboard>
            <agui-toggle id="mirror" label="Navigation visible" pub-to="LAYOUT/open" bind="$.value: LAYOUT/open"></agui-toggle>
          </agui-dashboard>
        </agui-viewport>
        <agui-sidebar id="other" side="end" label="Inspector" collapsed>
          <p>Independent content</p>
        </agui-sidebar>
        <footer slot="footer">Footer</footer>
      </agui-app>
    </context-provider>
  `);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('#draft input');
  assert.equal(await page.$eval('#viewport', (element) => element.getAttribute('role')), 'main');
  assert.equal(await page.$eval('#viewport', (element) => element.getAttribute('tabindex')), '0');
  assert.equal(await page.$eval('#navigation button', (element) => element.getAttribute('aria-expanded')), 'true');
  assert.equal(await page.$eval('#navigation button', (element) => element.getAttribute('aria-label')), 'Hide navigation');
  assert.equal(await page.$eval('#other .agui-sidebar-content', (element) => element.hasAttribute('hidden')), true);
  assert.equal(await page.$('agui-sidebar slot'), null);
  assert.equal(await page.$eval('#sidebar-title', (element) => element.textContent), 'Navigation');
  await cli('events', 'app-layout');
  assert.equal((await cli('events', 'app-layout')).events.length, 0);

  await page.type('#draft input', ' draft');
  await page.click('#navigation button');
  assert.equal(await page.$eval('#app', (element) => Reflect.get(element, '$').open), false);
  assert.equal(await page.$eval('#mirror input', (element) => element.checked), false);
  assert.equal(await page.$eval('#navigation .agui-sidebar-content', (element) => element.hasAttribute('hidden')), true);
  await page.focus('#navigation button');
  await page.keyboard.press('Space');
  assert.equal(await page.$eval('#draft input', (element) => element.value), 'Original draft');
  assert.equal(await page.$eval('#other .agui-sidebar-content', (element) => element.hasAttribute('hidden')), true);

  await cli('events', 'app-layout');
  await sendStdin('update', 'app-layout', JSON.stringify({
    selector: '#app',
    values: {
      open: false,
      title: 'Updated navigation',
    },
  }));
  assert.equal(await page.$eval('#navigation button', (element) => element.getAttribute('aria-label')), 'Show navigation');
  assert.equal(await page.$eval('#sidebar-title', (element) => element.textContent), 'Updated navigation');
  assert.equal((await cli('events', 'app-layout')).events.length, 0);

  let discovery = await cli('tools', 'app-layout');
  let setTool = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-sidebar' && tool.key === 'set_value');
  assert.ok(setTool);
  let call = {
    pageId: discovery.pageId,
    discoveryId: discovery.discoveryId,
    name: setTool.name,
    input: {
      value: true,
    },
  };
  assert.deepEqual((await sendStdin('call', 'app-layout', JSON.stringify(call))).result, {
    value: true,
    changed: true,
  });
  assert.deepEqual((await sendStdin('call', 'app-layout', JSON.stringify(call))).result, {
    value: true,
    changed: false,
  });
  assert.equal((await cli('events', 'app-layout')).events.length, 1);
  assert.equal(await page.$eval('#app', (element) => Reflect.get(element, '$').open), true);

  await sendStdin('update', 'app-layout', JSON.stringify({
    selector: '#navigation',
    values: {
      readonly: true,
    },
  }));
  call.input.value = false;
  await assert.rejects(sendStdin('call', 'app-layout', JSON.stringify(call)));
  assert.equal(await page.$eval('#navigation button', (element) => element.disabled), true);
  assert.equal(await page.$eval('#app', (element) => Reflect.get(element, '$').open), true);

  await cli('share', 'app-layout');
  let viewer = await browser.newPage();
  await viewer.goto(session.url);
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#draft input')?.getAttribute('value') === 'Original draft';
  });
  assert.equal(await viewer.evaluate(() => {
    let frame = /** @type {HTMLIFrameElement} */ (document.getElementById('agui-viewer'));
    return frame.contentDocument?.body.inert && !frame.contentWindow?.customElements.get('agui-sidebar');
  }), true);
  await page.focus('#draft input');
  await sendStdin('update', 'app-layout', JSON.stringify({
    selector: '#app',
    values: {
      open: false,
    },
  }));
  assert.equal(await page.$eval('#navigation button', (element) => element.getAttribute('aria-expanded')), 'false');
  await viewer.waitForFunction(() => {
    let frame = /** @type {HTMLIFrameElement | null} */ (document.getElementById('agui-viewer'));
    return frame?.contentDocument?.querySelector('#navigation button')?.getAttribute('aria-expanded') === 'false';
  });
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'navigation');

  let owners = discovery.tools.filter((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-sidebar')
    .map((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerId);
  await page.bringToFront();
  await page.$eval('#navigation', (element) => { Reflect.set(window, 'oldSidebar', element); });
  await insertStdin('app-layout', '<agui-app><agui-viewport aria-label="New workspace"><p>Replaced</p></agui-viewport></agui-app>');
  await page.waitForFunction(() => Reflect.get(window, 'oldSidebar').allSubs.size === 0);
  assert.equal((await cli('tools', 'app-layout')).tools.some((/** @type {import('../../types/tools.js').PageTool} */ tool) => owners.includes(tool.ownerId)), false);
  assert.deepEqual(errors, []);
});
