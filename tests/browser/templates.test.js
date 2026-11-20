import assert from 'node:assert/strict';
import { cp } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { renderTemplate } from '../../src/templates/render.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { definitionPaths } from '../../src/library/paths.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { temporaryState } from '../node/state-fixture.js';
import { mockIconFont } from './icon-font-fixture.js';

test('workspace starter uses native routing, shared edits and sidebar actions without application JavaScript', {
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  /** @type {SessionRuntime[]} */
  let runtimes = [];
  t.after(async () => {
    await browser.close();
    for (let runtime of runtimes) { await runtime.close(); }
    await state.close();
  });
  for (let configured of [
    false,
    true,
  ]) {
    let sessionId = configured ? 'configured-workspace' : 'default-workspace';
    let rendered = await renderTemplate('workspace', configured ? {
      APP: {
        title: 'Research',
        theme: 'light',
        footer: 'Local working notes',
      },
      DATA: {
        note: 'Initial note',
      },
      ROUTER: {
        routes: {
          overview: {
            title: 'Overview',
            src: './_assets/content.html',
            default: true,
          },
          notes: {
            title: 'Notes',
            src: './_assets/content.html',
          },
        },
      },
    } : {});
    let cached = await prepareCachedMarkup(sessionId, rendered.html);
    try { await cached.commit(); } finally { await cached.discard(); }
    await cp(rendered.assetsPath, definitionPaths(sessionId).assetsPath, {
      recursive: true,
    });
    let runtime = new SessionRuntime({
      sessionId,
      instanceId: randomUUID(),
      controlToken: '',
      pid: process.pid,
      launcherPid: process.pid,
    });
    runtimes.push(runtime);
    await runtime.start(new AbortController().signal);
    let page = await browser.newPage();
    await page.setViewport({
      width: 1440,
      height: 1000,
    });
    await mockIconFont(page);
    let errors = /** @type {string[]} */ ([]);
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(runtime.record.url || '');
    await page.waitForSelector('agui-viewport textarea');
    assert.doesNotMatch(rendered.html, /<script[^>]*type="module"/);
    assert.equal(await page.$eval('textarea', (field) => field.value), configured ? 'Initial note' : '');
    await page.locator('textarea').fill('Changed note');
    await page.waitForFunction(() => {
      let provider = document.querySelector('[ctx="DATA"]');
      return provider && Reflect.get(provider, '$').note === 'Changed note';
    });
    if (configured) {
      await page.locator('agui-nav button[value="notes"]').click();
      await page.waitForFunction(() => document.querySelector('h1')?.textContent?.trim() === 'Notes');
      await page.waitForSelector('textarea');
      assert.equal(await page.$eval('textarea', (field) => field.value), 'Changed note');
      assert.equal(await page.$eval('agui-nav button[value="notes"]', (button) => button.getAttribute('aria-current')), 'page');
    }
    await page.locator('agui-header ::-p-aria([name="Note actions"][role="button"])').click();
    await page.locator('agui-sidebar[side="end"] ::-p-aria([name="Clear note"][role="button"])').click();
    await page.waitForFunction(() => document.querySelector('textarea')?.value === '');
    await page.locator('agui-sidebar[side="end"] ::-p-aria([name="Close"][role="button"])').click();
    assert.equal(await page.$eval('agui-sidebar[side="end"]', (sidebar) => sidebar.hasAttribute('hidden')), true);
    await page.reload();
    await page.waitForSelector('textarea');
    assert.equal(await page.$eval('textarea', (field) => field.value), configured ? 'Initial note' : '');
    assert.deepEqual(errors, []);
    await page.close();
  }
});
