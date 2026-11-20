import assert from 'node:assert/strict';
import test from 'node:test';
import puppeteer from 'puppeteer';
import { temporaryState } from '../node/state-fixture.js';
import { cli, insertStdin, sendStdin } from './helpers.js';

test('explorer reuses list selection, publishes lazy requests and expansion, and guards tools and incoming changes', {
  timeout: 45_000,
}, async (t) => {
  let state = await temporaryState();
  let browser = await puppeteer.launch({
    headless: true,
  });
  t.after(async () => { await browser.close(); await cli('stop', 'explorer').catch(() => {}); await state.close(); });
  let data = {
    items: [
      {
        id: 'docs',
        label: 'Documents',
        branch: true,
      },
      {
        id: 'brief',
        label: 'Brief',
        parentId: 'docs',
      },
      {
        id: 'lazy',
        label: 'Incoming',
        branch: true,
        loaded: false,
      },
    ],
    selected: [],
    expanded: [],
    request: null,
    readonly: false,
    texts: {
      empty: 'No entries.',
      invalidRows: 'Invalid hierarchy.',
      invalidState: 'Invalid state.',
      unavailable: 'Unavailable.',
      expand: 'Expand',
      collapse: 'Collapse',
      select: 'Select',
      more: 'More',
      retry: 'Retry',
    },
  };
  let session = await cli('start', 'explorer', '--no-open');
  await insertStdin('explorer', `<sym-context ctx="TREE"><script type="application/json">${JSON.stringify(data)}</script>
    <agui-explorer label="Documents" pub-to="TREE/selected" expanded-pub-to="TREE/expanded" request-pub-to="TREE/request"
      bind="$.items: TREE/items; $.value: TREE/selected; $.expanded: TREE/expanded; $.texts: TREE/texts; $.readonly: TREE/readonly"></agui-explorer>
    </sym-context>`);
  let page = await browser.newPage();
  let errors = /** @type {string[]} */ ([]);
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(session.url);
  await page.waitForSelector('agui-explorer button[value="docs"]');
  assert.equal(await page.$('button[value="brief"]'), null);
  await page.focus('button[value="docs"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('button[value="brief"]');
  await page.click('button[value="brief"]');
  assert.deepEqual(await page.$eval('sym-context', (owner) => Reflect.get(owner, '$').selected), [
    'brief',
  ]);
  await page.click('button[value="docs"]');
  assert.equal(await page.$('button[value="brief"]'), null);
  assert.deepEqual(await page.$eval('sym-context', (owner) => Reflect.get(owner, '$').selected), [
    'brief',
  ]);
  await page.click('button[value="lazy"]');
  assert.deepEqual(await page.$eval('sym-context', (owner) => Reflect.get(owner, '$').request), {
    id: 'lazy',
    action: 'expand',
  });
  await page.$eval('sym-context', (owner) => {
    let state = Reflect.get(owner, '$');
    state.items = state.items.map((/** @type {import('../../uilib/types/uilib-explorer.js').UiExplorerNode} */ node) => node.id === 'lazy' ? {
      ...node,
      loaded: true,
    } : node).concat({
      id: 'loaded',
      label: 'Loaded',
      parentId: 'lazy',
    });
  });
  await page.waitForSelector('button[value="loaded"]');
  await page.click('button[value="loaded"]');
  assert.deepEqual(await page.$eval('sym-context', (owner) => Reflect.get(owner, '$').selected), [
    'loaded',
  ]);
  let discovery = await cli('tools', 'explorer');
  let toggle = discovery.tools.find((/** @type {import('../../types/tools.js').PageTool} */ tool) => tool.ownerName === 'agui-explorer' && tool.key === 'toggle_node');
  assert.ok(toggle);
  let result = await sendStdin('call', 'explorer', JSON.stringify({
    pageId: discovery.pageId,
    discoveryId: discovery.discoveryId,
    name: toggle.name,
    input: {
      id: 'docs',
    },
  }));
  assert.equal(result.result.expanded, true);
  await page.$eval('agui-explorer', (owner) => owner.setAttribute('selection', 'multiple'));
  await page.click('button[value="brief"]');
  assert.deepEqual(await page.$eval('sym-context', (owner) => Reflect.get(owner, '$').selected), [
    'loaded',
    'brief',
  ]);
  await page.$eval('agui-explorer', (owner) => {
    owner.setAttribute('selection', 'single');
    owner.setAttribute('select-branches', '');
  });
  await page.click('button[value="docs"]');
  assert.deepEqual(await page.$eval('sym-context', (owner) => Reflect.get(owner, '$').selected), [
    'docs',
  ]);
  assert.equal(await page.$eval('button[value="docs"]', (button) => button.getAttribute('aria-pressed')), 'true');
  await page.$eval('sym-context', (owner) => { Reflect.get(owner, '$').readonly = true; });
  assert.equal(await page.$eval('button[value="loaded"]', (button) => button.disabled), true);
  await page.$eval('sym-context', (owner) => {
    Reflect.get(owner, '$').items = [
      {
        id: 'bad',
        label: 'Bad',
        parentId: 'missing',
      },
    ];
  });
  await page.waitForFunction(() => document.querySelector('agui-explorer')?.getAttribute('data-state') === 'error');
  assert.equal(await page.$eval('agui-explorer', (owner) => owner.getAttribute('data-message')), 'Invalid hierarchy.');
  assert.deepEqual(errors, []);
});
