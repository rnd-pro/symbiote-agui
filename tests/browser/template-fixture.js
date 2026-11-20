import { randomUUID } from 'node:crypto';
import puppeteer from 'puppeteer';
import { createTemplate } from '../../src/templates/create.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { temporaryState } from '../node/state-fixture.js';
import { mockIconFont } from './icon-font-fixture.js';

/**
 * @param {import('node:test').TestContext} t
 * @param {string} id
 * @param {unknown} [configuration]
 */
export async function templatePage(t, id, configuration = {}) {
  let state = await temporaryState();
  let runtime = new SessionRuntime({
    sessionId: 'starter',
    instanceId: randomUUID(),
    controlToken: '',
    pid: process.pid,
    launcherPid: process.pid,
  });
  /** @type {import('puppeteer').Browser | undefined} */
  let browser;
  t.after(async () => {
    await browser?.close();
    await runtime.close();
    await state.close();
  });
  await createTemplate(id, 'starter', configuration);
  await runtime.start(new AbortController().signal);
  browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  let page = await browser.newPage();
  await page.setViewport({
    width: 1440,
    height: 1000,
  });
  await mockIconFont(page);
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  return {
    page,
    errors,
    url: runtime.record.url || '',
  };
}
