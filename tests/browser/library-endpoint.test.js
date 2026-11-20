import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { reserveSession } from '../../src/sessions/store.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { tunnelProxy } from './tunnel-proxy.js';
import { reserveManager, releaseManager } from '../../src/manager/registry.js';
import { startManagerServer } from '../../src/manager/server.js';

test('local assets are bounded and CDN adapters share the selected runtime in pages and manager', {
  timeout: 60_000,
}, async (t) => {
  let state = await temporaryState();
  let previous = process.env.AGUI_UILIB_URL;
  let source = new SessionRuntime(await reserveSession('assets-source'));
  let target = new SessionRuntime(await reserveSession('cdn-target'));
  let proxy = await tunnelProxy();
  t.after(async () => {
    if (previous === undefined) { delete process.env.AGUI_UILIB_URL; } else { process.env.AGUI_UILIB_URL = previous; }
    await target.close();
    await proxy.close();
    await source.close();
    await state.close();
  });
  await source.start(new AbortController().signal);
  assert.ok(source.record.url);
  proxy.setTarget(source.record.url);
  let base = `${proxy.origin}/uilib/`;
  process.env.AGUI_UILIB_URL = `${base}library.js`;
  let saved = await prepareCachedMarkup('cdn-target', '<sym-context ctx="APP"><script type="application/json">{"name":"Initial"}</script><agui-field label="Name" pub-to="APP/name" bind="$.value: APP/name"></agui-field></sym-context>');
  await saved.commit();
  await saved.discard();
  await target.start(new AbortController().signal);
  let managerRecord = await reserveManager();
  let manager = await startManagerServer(managerRecord, () => {});
  t.after(async () => { await manager.close(); await releaseManager(managerRecord); });
  let browser = await puppeteer.launch({
    headless: true,
    acceptInsecureCerts: true,
    args: [
      '--host-resolver-rules=MAP agui-test.trycloudflare.com 127.0.0.1',
      '--no-proxy-server',
    ],
  });
  t.after(() => browser.close());
  let page = await browser.newPage();
  assert.ok(target.record.url);
  await page.goto(target.record.url);
  await page.waitForSelector('agui-field input');
  await page.locator('agui-field input').fill('Updated');
  await page.waitForFunction(() => Reflect.get(document.querySelector('sym-context') || {}, '$')?.name === 'Updated');
  assert.equal(await page.evaluate(async (url) => {
    let library = await import(url);
    return document.querySelector('agui-field') instanceof library.Field;
  }, `${base}library.js`), true);
  let admin = await browser.newPage();
  await admin.goto(`${manager.url}#${managerRecord.token}`);
  await admin.waitForSelector('#manager-navigation button');
  await admin.waitForFunction(() => Reflect.get(document.querySelector('agui-session-manager') || {}, '$')?.loading === false);
  assert.equal(await admin.evaluate(async (url) => {
    let library = await import(url);
    return document.querySelector('agui-nav') instanceof library.Nav;
  }, `${base}library.js`), true);
  for (let path of [
    'types/index.d.ts',
    'assets.json',
    '../package.json',
    'missing.js',
  ]) {
    assert.equal((await fetch(new URL(`/uilib/${path}`, source.record.url))).status, 404);
  }
  let asset = await fetch(new URL('/uilib/library.js', source.record.url), {
    headers: {
      Origin: 'https://example.org',
    },
  });
  assert.equal(asset.headers.get('access-control-allow-origin'), '*');
  let privateResponse = await fetch(new URL('/manager/status', manager.url));
  assert.equal(privateResponse.status, 403);
  assert.equal(privateResponse.headers.get('access-control-allow-origin'), null);
});
