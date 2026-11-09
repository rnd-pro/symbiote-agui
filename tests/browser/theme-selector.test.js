import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { THEME_PALETTES } from '../../src/uilib/controls/theme-selector/palettes.js';

function makeRuntime() {
  return new SessionRuntime({
    sessionId: 'palettes',
    instanceId: randomUUID(),
    controlToken: '',
    pid: process.pid,
    launcherPid: process.pid,
  });
}

test('palette and mode clicks save only their declared properties, survive reload and restart, and mirror to viewers', {
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let runtime = makeRuntime();
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await runtime.close();
    await state.close();
  });
  let saved = await prepareCachedMarkup('palettes', `
    <context-provider ctx="APP" persist="palette note theme">
      <script type="application/json">{"palette":"graphite","note":"Saved note","theme":"light"}</script>
      <agui-toolbar aria-label="Appearance">
        <agui-theme-selector label="App theme" pub-to="APP/palette"
          bind="$.value: APP/palette; $: AGUI_TEXT/themeSelector"></agui-theme-selector>
        <agui-theme-toggle ctx="APP" label="Day or night" bind="$: AGUI_TEXT/themeToggle"></agui-theme-toggle>
      </agui-toolbar>
      <agui-field label="Note" name="note" pub-to="APP/note" bind="$.value: APP/note"></agui-field>
    </context-provider>
  `);
  try { await saved.commit(); } finally { await saved.discard(); }
  await runtime.start(new AbortController().signal);
  assert.ok(runtime.access && runtime.pages && runtime.record.url);
  runtime.access.sharing = true;
  runtime.pages.shared.enable(runtime.latest?.revision ?? 0);
  let url = runtime.record.url;
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
    args: [
      '--disable-blink-features=WebMCP,WebMCPTesting',
    ],
  });
  let page = await browser.newPage();
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(url);
  await page.waitForSelector('agui-theme-selector > button:not(:disabled)');
  await page.locator('input[name="note"]').fill('Unsaved note');
  await page.locator('agui-theme-selector > button').click();
  assert.equal(await page.$$eval('.agui-theme-option', (buttons) => buttons.length), THEME_PALETTES.length);
  await page.locator('.agui-theme-option[value="ocean"]').click();
  await page.waitForFunction(() => {
    let selector = document.querySelector('agui-theme-selector');
    return selector && Reflect.get(selector, '$').saveState === 'committed';
  });
  assert.equal(await page.$eval('body', (body) => body.dataset.palette), 'ocean');
  assert.equal(await page.$eval('.agui-theme-option[value="ocean"]', (button) => button.getAttribute('aria-pressed')), 'true');
  await page.keyboard.press('Escape');
  await page.locator('agui-theme-toggle button').click();
  await page.waitForFunction(() => {
    let toggle = document.querySelector('agui-theme-toggle');
    return toggle && Reflect.get(toggle, '$').saveState === 'committed';
  });
  assert.equal(await page.$eval('body', (body) => body.dataset.theme), 'dark');
  assert.equal(await page.$eval('body', (body) => body.dataset.palette), 'ocean');

  await page.reload();
  await page.waitForSelector('agui-theme-selector > button:not(:disabled)');
  assert.equal(await page.$eval('body', (body) => body.dataset.palette), 'ocean');
  assert.equal(await page.$eval('input[name="note"]', (input) => input.value), 'Saved note');
  assert.equal(await page.$eval('body', (body) => body.dataset.theme), 'dark');

  // New palette assignments apply immediately, but initialization/bindings never save.
  await page.$eval('context-provider', (provider) => {
    Reflect.get(provider, '$').palette = 'forest';
    Reflect.get(provider, '$').theme = 'system';
  });
  await page.waitForFunction(() => document.body.dataset.palette === 'forest');
  await page.emulateMediaFeatures([
    {
      name: 'prefers-color-scheme',
      value: 'light',
    },
  ]);
  await page.reload();
  await page.waitForSelector('agui-theme-selector > button:not(:disabled)');
  assert.equal(await page.$eval('body', (body) => body.dataset.palette), 'ocean');
  assert.equal(await page.$eval('body', (body) => body.dataset.theme), 'dark');
  await page.$eval('agui-theme-toggle', (toggle) => {
    Reflect.apply(Reflect.get(toggle, 'commit'), toggle, [
      false,
    ]);
  });
  assert.equal(await page.$eval('body', (body) => body.dataset.theme), 'light');
  await page.reload();
  await page.waitForSelector('agui-theme-selector > button:not(:disabled)');
  assert.equal(await page.$eval('body', (body) => body.dataset.theme), 'dark');

  let viewer = await browser.newPage();
  await viewer.goto(`${url}?mode=viewer`);
  await viewer.waitForFunction(() => document.body.dataset.palette === 'ocean');
  await page.bringToFront();
  await page.locator('agui-theme-selector > button').click();
  await page.locator('.agui-theme-option[value="desert"]').click();
  await page.waitForFunction(() => {
    let selector = document.querySelector('agui-theme-selector');
    return selector && Reflect.get(selector, '$').saveState === 'committed';
  });
  await viewer.bringToFront();
  await viewer.waitForFunction(() => document.body.dataset.palette === 'desert');
  await viewer.waitForFunction(() => document.body.dataset.theme === 'dark');
  await page.bringToFront();
  await page.keyboard.press('Escape');
  await page.focus('agui-theme-toggle button');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    let toggle = document.querySelector('agui-theme-toggle');
    return toggle && Reflect.get(toggle, '$').saveState === 'committed';
  });
  await viewer.bringToFront();
  await viewer.waitForFunction(() => document.body.dataset.theme === 'light');

  await page.close();
  await viewer.close();
  await runtime.close();
  runtime = makeRuntime();
  await runtime.start(new AbortController().signal);
  assert.ok(runtime.record.url);
  let restored = await browser.newPage();
  await restored.goto(runtime.record.url);
  await restored.waitForSelector('agui-theme-selector > button:not(:disabled)');
  assert.equal(await restored.$eval('body', (body) => body.dataset.palette), 'desert');
  assert.equal(await restored.$eval('body', (body) => body.dataset.theme), 'light');
  assert.deepEqual(errors, []);
});
