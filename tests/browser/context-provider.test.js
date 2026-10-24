import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin } from './helpers.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

test('providers bind object fields and publish fresh drafts without echoing replacements', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => {
    await cli('stop', 'provider-object').catch(() => {});
    await browser?.close();
    await state.close();
  });
  let session = await cli('start', 'provider-object', '--no-open');
  await insertStdin('provider-object', [
    '<template id="contact-feature">',
    '<agui-panel>',
    '<agui-field label="Name" name="name" pub-to="^name" bind="$.value: ^name"></agui-field>',
    '<agui-field label="Note" name="note" pub-to="^note" bind="$.value: ^note"></agui-field>',
    '<agui-component><output>{{^name}}</output></agui-component>',
    '</agui-panel>',
    '</template>',
    '<context-provider id="source" ctx="APP" persist="contact">',
    '<script type="application/json">{"contact":{"name":"Avery","note":"Original note","details":{"stage":"new"}},"note":"Outer note"}</script>',
    '<context-provider id="first" ctx="FEATURE" use-template="#contact-feature" pub-to="APP/contact" bind="state: APP/contact">',
    '<script type="application/json">{"localOnly":"Local hint"}</script>',
    '</context-provider>',
    '<context-provider id="peer" use-template="#contact-feature" pub-to="APP/contact" bind="state: APP/contact"></context-provider>',
    '<context-provider id="draft" use-template="#contact-feature" bind="state: APP/contact"></context-provider>',
    '</context-provider>',
  ].join('\n'));
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
  await page.waitForFunction(() => document.querySelector('#peer output')?.textContent === 'Avery');
  await page.$eval('#source', (element) => {
    let source = /** @type {import('../../types/components.js').ComponentHost} */ (element);
    Reflect.set(window, 'originalContact', source.$.contact);
    Reflect.set(window, 'contactWrites', 0);
    source.sub('contact', () => Reflect.set(window, 'contactWrites', Reflect.get(window, 'contactWrites') + 1), false);
  });
  await page.$eval('#first agui-field[name="name"]', (element) => Reflect.get(element, 'commit').call(element, 'Casey'));
  assert.equal(await page.$eval('#peer output', (element) => element.textContent), 'Casey');
  assert.deepEqual(await page.$eval('#source', (element) => ({
    contact: Reflect.get(element, '$').contact,
    original: Reflect.get(window, 'originalContact'),
    fresh: Reflect.get(element, '$').contact !== Reflect.get(window, 'originalContact'),
    writes: Reflect.get(window, 'contactWrites'),
  })), {
    contact: {
      name: 'Casey',
      note: 'Original note',
      details: {
        stage: 'new',
      },
    },
    original: {
      name: 'Avery',
      note: 'Original note',
      details: {
        stage: 'new',
      },
    },
    fresh: true,
    writes: 1,
  });
  await page.$eval('#first', (element) => {
    let provider = /** @type {import('../../types/components.js').ComponentHost} */ (element);
    provider.$.name = 'Casey';
    provider.$.localOnly = 'Changed local hint';
  });
  assert.equal(await page.evaluate(() => Reflect.get(window, 'contactWrites')), 1);
  await page.$eval('#draft agui-field[name="name"]', (element) => Reflect.get(element, 'commit').call(element, 'Private draft'));
  assert.equal(await page.$eval('#draft output', (element) => element.textContent), 'Private draft');
  assert.equal(await page.$eval('#source', (element) => Reflect.get(element, '$').contact.name), 'Casey');
  await page.$eval('#source', (element) => {
    Reflect.get(element, '$').contact = {
      name: 'Morgan',
      added: 7,
    };
  });
  assert.equal(await page.evaluate(() => Reflect.get(window, 'contactWrites')), 2, 'Source replacements must not echo outward.');
  assert.equal(await page.$eval('#first input[name="note"]', (element) => element.value), '');
  assert.equal(await page.$eval('#draft output', (element) => element.textContent), 'Morgan');
  assert.equal(await page.$eval('#first', (element) => Reflect.get(element, '$').added), 7);
  await page.$eval('#first', (element) => { Reflect.get(element, '$').added = 8; });
  assert.equal(await page.$eval('#source', (element) => Reflect.get(element, '$').contact.added), 8);
  await page.$eval('#first', (element) => { Reflect.get(element, '$')['FEATURE/name'] = 'Taylor'; });
  assert.equal(await page.$eval('#source', (element) => Reflect.get(element, '$').contact.name), 'Taylor');
  assert.equal(await page.$eval('#peer output', (element) => element.textContent), 'Taylor');
  assert.equal(await page.evaluate(() => Reflect.get(window, 'contactWrites')), 4);
  assert.equal(await page.$eval('#first', (element) => {
    let invalid = [
      [],
      null,
      {
        'APP/name': 'Invalid scoped field',
      },
      JSON.parse('{"__proto__":{}}'),
    ];
    return invalid.every((value) => {
      try { Reflect.set(element, 'state', value); }
      catch { return true; }
      return false;
    });
  }), true);
  await page.$eval('#first', (element) => {
    Reflect.set(window, 'oldProvider', element);
    element.remove();
  });
  await page.waitForFunction(() => Reflect.get(window, 'oldProvider').allSubs.size === 0);
  await page.evaluate(() => Reflect.get(window, 'oldProvider').set$({
    name: 'Detached change',
  }));
  assert.equal(await page.$eval('#source', (element) => Reflect.get(element, '$').contact.name), 'Taylor');
  assert.deepEqual(errors, []);
});
