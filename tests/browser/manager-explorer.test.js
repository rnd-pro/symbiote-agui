import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { connectProject } from '../../src/projects/registry.js';
import { EXPLORER_PAGE_SIZE } from '../../src/projects/explorer/constants.js';
import { temporaryManagerProject } from '../node/manager-storage-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

/** @param {import('node:test').TestContext} t */
async function fixture(t) {
  let project = await temporaryManagerProject();
  let folder = await realpath(await mkdtemp(join(tmpdir(), 'agui-explorer-ui-')));
  let browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  t.after(async () => {
    await browser.close();
    await project.close();
    await rm(folder, {
      recursive: true,
      force: true,
    });
  });
  return {
    project,
    folder,
    browser,
  };
}

/** @param {import('puppeteer-core').Page} page */
async function openExplorer(page) {
  await page.click('#session-views [role="tab"][value="explorer"]');
  try { await page.waitForSelector('#explorer-entries [data-entry] button'); }
  catch (error) {
    let state = await page.evaluate(() => {
      let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
      return {
        active: owner.explorer?.active,
        projectId: owner.explorer?.projectId,
        view: owner.$.workspaceView,
        status: owner.$.explorerStatus,
        message: owner.$.explorerMessage,
        error: owner.$.notice,
      };
    });
    throw new Error(JSON.stringify(state), {
      cause: error,
    });
  }
}

test('manager lazily expands project folders and previews source or inert Markdown while sessions stay available', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45000,
}, async (t) => {
  let {
    project,
    folder,
    browser,
  } = await fixture(t);
  await Promise.all([
    mkdir(join(folder, 'docs')),
    mkdir(join(folder, 'empty')),
    mkdir(join(folder, 'pages')),
    writeFile(join(folder, '.hidden.txt'), 'Hidden fixture.'),
    writeFile(join(folder, 'data.json'), '{"fixture":"current"}'),
    writeFile(join(folder, 'source.html'), '<script>window.explorerExecuted = true;</script><agui-field label="Must stay inert"></agui-field>'),
    writeFile(join(folder, 'draft.html'), '<agui-field label="Draft" name="draft" value="Keep"></agui-field>'),
  ]);
  await writeFile(join(folder, 'docs', 'guide.md'), '# Project guide\n\nRead-only preview.\n\n<explorer-probe>Fallback document content</explorer-probe>\n<agui-field label="Do not instantiate"></agui-field>\n<script>window.explorerExecuted = true;</script>');
  await Promise.all(Array.from({
    length: EXPLORER_PAGE_SIZE + 1,
  }, (_, index) => writeFile(join(folder, 'pages', `entry-${String(index).padStart(3, '0')}.txt`), 'Page fixture.')));
  await project.cli([
    'config',
    'folder',
    folder,
  ]);
  let session = await project.cli([
    'start',
    'draft',
    '--no-open',
  ]);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  let draftPage = await browser.newPage();
  await draftPage.goto(session.url);
  await draftPage.waitForSelector('input[name="draft"]');
  await draftPage.type('input[name="draft"]', ' unchanged');
  let draft = await draftPage.$eval('input[name="draft"]', (element) => element.value);
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => { errors.push(String(error)); t.diagnostic(String(error)); });
  await page.goto(manager.launchUrl);
  await page.waitForSelector('#manager-table tr[data-row-id="draft"]');
  assert.equal(await page.$('#explorer-entries [data-entry]'), null, 'Browsing is deferred until the explorer is selected.');
  await page.evaluate(() => {
    customElements.define('explorer-probe', class extends HTMLElement {
      constructor() {
        super();
        Reflect.set(window, 'explorerConstructed', true);
      }
    });
  });
  await openExplorer(page);
  assert.equal(await page.$('#explorer-entries [data-entry="docs/guide.md"]'), null, 'Nested entries are fetched on expansion.');
  assert.equal(await page.$('#explorer-entries [data-entry=".hidden.txt"]'), null);
  await page.click('#explorer-entries [data-entry="docs"] button');
  await page.waitForSelector('#explorer-entries [data-entry="docs/guide.md"] button');
  await page.click('#explorer-entries [data-entry="docs/guide.md"] button');
  await page.waitForSelector('#explorer-preview agui-markdown h1');
  assert.equal(await page.$eval('#explorer-preview agui-markdown h1', (element) => element.textContent), 'Project guide');
  assert.equal(await page.$('#explorer-preview agui-field'), null);
  assert.equal(await page.$('#explorer-preview explorer-probe'), null);
  assert.equal(await page.evaluate(() => !!Reflect.get(window, 'explorerConstructed')), false);
  assert.equal(await page.evaluate(() => !!Reflect.get(window, 'explorerExecuted')), false);
  assert.ok(await page.$('nav[aria-label="Project breadcrumbs"] button'));
  await page.click('#explorer-entries [data-entry="source.html"] button');
  await page.waitForFunction(() => document.querySelector('#explorer-preview pre code')?.textContent?.includes('<script>'));
  assert.equal(await page.evaluate(() => !!Reflect.get(window, 'explorerExecuted')), false);
  await page.click('#explorer-entries [data-entry="empty"] button');
  await page.waitForFunction(() => document.querySelector('#explorer-entries')?.textContent?.includes('This folder is empty.'));
  await page.click('#explorer-entries [data-entry="pages"] button');
  await page.waitForSelector('#explorer-entries [data-entry="pages/entry-099.txt"]');
  assert.equal(await page.$('#explorer-entries [data-entry="pages/entry-100.txt"]'), null);
  await page.locator('#explorer-entries ::-p-aria([name="Load more entries"][role="button"])').click();
  await page.waitForSelector('#explorer-entries [data-entry="pages/entry-100.txt"]');
  await page.click('agui-toggle[name="explorerHidden"] input');
  await page.waitForSelector('#explorer-entries [data-entry=".hidden.txt"] button');
  await page.click('#explorer-entries [data-entry=".hidden.txt"] button');
  await page.waitForFunction(() => document.querySelector('#explorer-preview pre code')?.textContent === 'Hidden fixture.');
  await page.click('agui-toggle[name="explorerHidden"] input');
  await page.waitForFunction(() => !document.querySelector('#explorer-entries [data-entry=".hidden.txt"]'));
  assert.equal(await page.$eval('#explorer-preview pre code', (element) => element.textContent), '', 'Hiding content also clears its preview.');
  await writeFile(join(folder, 'new.txt'), 'New file.');
  await page.locator('::-p-aria([name="Refresh files"][role="button"])').click();
  await page.waitForSelector('#explorer-entries [data-entry="new.txt"] button');
  await rm(join(folder, 'new.txt'));
  await page.click('#explorer-entries [data-entry="new.txt"] button');
  await page.waitForFunction(() => document.querySelector('#explorer-preview')?.textContent?.includes('ENOENT'));
  assert.equal(await page.evaluate(async () => (await fetch('/manager/files/source.html')).status), 404);
  await page.click('#session-views [role="tab"][value="table"]');
  await page.waitForSelector('#manager-table tr[data-row-id="draft"]');
  assert.equal(await draftPage.$eval('input[name="draft"]', (element) => element.value), draft);
  assert.equal((await project.cli([
    'status',
    'draft',
  ])).url, session.url);
  assert.deepEqual(errors, []);
});

test('Default uses readable definitions and explorer drops delayed responses after scope changes and reconnect', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45000,
}, async (t) => {
  let {
    project,
    folder,
    browser,
  } = await fixture(t);
  let source = join(project.directory, 'source.html');
  await writeFile(source, '<h1>Saved default definition</h1>');
  await project.cli([
    'save',
    'demo-desk',
    '--file',
    source,
  ]);
  await writeFile(join(folder, 'current.txt'), 'Current project content.');
  let connected = await connectProject(folder);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(manager.launchUrl);
  await page.waitForSelector('#manager-table tr[data-row-id="demo-desk"]');
  await openExplorer(page);
  await page.waitForSelector('#explorer-entries [data-entry="demo-desk.html"] button');
  await page.click('#explorer-entries [data-entry="demo-desk.html"] button');
  await page.waitForFunction(() => document.querySelector('#explorer-preview pre code')?.textContent === '<h1>Saved default definition</h1>');
  await page.evaluate(async (id) => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    let connection = owner.connection;
    let explorer = owner.explorer;
    if (!connection || !explorer) { throw new Error('Explorer is unavailable.'); }
    clearInterval(owner.interval);
    let request = connection.request.bind(connection);
    /** @type {(value: import('../../types/manager.js').ManagerResult) => void} */
    let resolve = () => {};
    connection.request = (operation, options) => operation === 'project preview' ? new Promise((done) => { resolve = done; }) : request(operation, options);
    let pending = explorer.preview('demo-desk.html');
    explorer.setProject(id);
    resolve({
      ok: true,
      preview: {
        projectId: 'default',
        path: 'demo-desk.html',
        kind: 'text',
        text: 'STALE DEFAULT CONTENT',
        size: 21,
      },
    });
    await pending;
    connection.request = request;
  }, connected.id);
  await page.waitForSelector('#explorer-entries [data-entry="current.txt"] button');
  assert.equal(await page.$eval('#explorer-preview pre code', (element) => element.textContent), '');
  await page.evaluate(async () => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    let connection = owner.connection;
    let explorer = owner.explorer;
    if (!connection || !explorer) { throw new Error('Explorer is unavailable.'); }
    let request = connection.request.bind(connection);
    /** @type {(value: import('../../types/manager.js').ManagerResult) => void} */
    let resolve = () => {};
    connection.request = (operation, options) => operation === 'project entries' ? new Promise((done) => { resolve = done; }) : request(operation, options);
    let pending = explorer.load('');
    let socket = connection.socket;
    await new Promise((done) => { socket?.addEventListener('close', done, {
      once: true,
    }); socket?.close(); });
    resolve({
      ok: true,
      directory: {
        projectId: 'default',
        path: '',
        entries: [
          {
            name: 'STALE.txt',
            path: 'STALE.txt',
            kind: 'file',
          },
        ],
      },
    });
    await pending;
    connection.request = request;
  });
  await page.waitForFunction(() => document.querySelector('.connection .agui-message-text')?.textContent === 'Connected');
  await page.waitForSelector('#explorer-entries [data-entry="demo-desk.html"] button');
  assert.equal(await page.$('#explorer-entries [data-entry="STALE.txt"]'), null);
});
