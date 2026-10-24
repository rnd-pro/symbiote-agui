import assert from 'node:assert/strict';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import puppeteer from 'puppeteer-core';
import { projectId } from '../../src/projects/identity.js';
import { temporaryManagerProject } from '../node/manager-storage-fixture.js';

let executablePath = process.env.AGUI_TEST_BROWSER_PATH;

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} id
 */
async function waitForProject(page, id) {
  await page.waitForFunction((expected) => {
    let control = document.querySelector('#manager-project-switcher select');
    return control instanceof HTMLSelectElement && control.value === expected && !control.disabled;
  }, {}, id);
  assert.equal(new URL(page.url()).hash, '', 'Authorization removes the private launch fragment.');
}

/** @param {import('puppeteer-core').Page} page */
async function openProjects(page) {
  await page.click('.toolbar button[aria-label="Projects"]');
  await page.waitForSelector('#manager-projects dialog[open]');
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} folder
 */
async function connect(page, folder) {
  await page.waitForFunction(() => {
    let input = document.querySelector('#manager-connect-project input');
    return input instanceof HTMLInputElement && !input.disabled && input.value === '';
  });
  await page.type('#manager-connect-project input', folder);
  await page.click('#manager-connect-project button[type="submit"]');
  await page.waitForSelector(`#manager-project-list [data-project="${projectId(folder)}"]`);
  await page.waitForFunction(() => {
    let input = document.querySelector('#manager-connect-project input');
    return input instanceof HTMLInputElement && !input.disabled && input.value === '';
  });
}

/**
 * @param {import('puppeteer-core').Page} page
 * @param {string} id
 */
async function switchProject(page, id) {
  await page.select('#manager-project-switcher select', id);
  await page.waitForFunction(() => !document.querySelector('#manager-switch-project')?.hasAttribute('disabled'));
  let navigation = page.waitForNavigation();
  await page.click('#manager-switch-project');
  await navigation;
  await waitForProject(page, id);
}

test('manager connects projects, switches remembered scopes and Default, and preserves independent tabs and sessions', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 60000,
}, async (t) => {
  let project = await temporaryManagerProject();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => { await browser?.close(); await project.close(); });
  let folderA = join(project.projectDirectory, 'project a');
  let folderB = join(project.projectDirectory, 'project b');
  let removed = join(project.projectDirectory, 'removed');
  await Promise.all([
    mkdir(folderA),
    mkdir(folderB),
    mkdir(removed),
  ]);
  let configPath = join(project.projectDirectory, '.agui.json');
  let originalConfig = '{"label":"keep project configuration"}\n';
  await writeFile(configPath, originalConfig);
  let source = join(project.directory, 'fixture.html');
  await writeFile(source, '<agui-field label="Draft" name="draft" value="Initial"></agui-field>');
  for (let folder of [
    '',
    folderA,
    folderB,
  ]) {
    await project.cli([
      'save',
      'desk',
      '--file',
      source,
    ], folder);
  }
  let session = await project.cli([
    'start',
    'desk',
    '--no-open',
  ], '');
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  let generated = await browser.newPage();
  await generated.goto(session.url);
  await generated.waitForSelector('input[name="draft"]');
  await generated.type('input[name="draft"]', ' unsaved');
  let draft = await generated.$eval('input[name="draft"]', (element) => element.value);
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  /** @type {string[]} */
  let errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(manager.launchUrl);
  await waitForProject(page, 'default');
  await page.waitForSelector('#manager-table tr[data-row-id="desk"] td[data-column=""] input');
  await page.click('#manager-table tr[data-row-id="desk"] td[data-column=""] input');
  await page.waitForSelector('#session-inspector [data-session="desk"]');
  await openProjects(page);
  await connect(page, folderA);
  await connect(page, folderB);
  assert.equal(await page.$eval('#manager-project-list [data-project="default"] button:last-child', (element) => element.hasAttribute('disabled')), true);
  let navigation = page.waitForNavigation();
  await page.locator(`#manager-project-list [data-project="${projectId(folderA)}"] ::-p-aria([name="Switch"][role="button"])`).click();
  await navigation;
  await waitForProject(page, projectId(folderA));
  let urlA = page.url();
  assert.notEqual(urlA, manager.url);
  await page.waitForSelector('#manager-table tr[data-row-id="desk"]');
  assert.equal(await page.$eval('#manager-table tr[data-row-id="desk"] td[data-column=""] input', (element) => Reflect.get(element, 'checked')), false);
  assert.equal(await page.$eval('#session-inspector', (element) => element.hasAttribute('hidden')), true);
  await page.reload();
  await waitForProject(page, projectId(folderA));
  let second = await browser.newPage();
  second.on('pageerror', (error) => errors.push(String(error)));
  await second.goto(urlA);
  await waitForProject(second, projectId(folderA));
  await switchProject(second, projectId(folderB));
  let urlB = second.url();
  assert.equal(page.url(), urlA, 'Another manager tab keeps its selected project.');
  await openProjects(second);
  await second.type('#manager-connect-project input', join(project.projectDirectory, 'missing'));
  await second.click('#manager-connect-project button[type="submit"]');
  await second.waitForFunction(() => document.querySelector('#manager-projects [role="alert"]')?.textContent?.includes('unavailable'));
  assert.equal(second.url(), urlB, 'A connection failure does not navigate away.');
  await second.$eval('#manager-connect-project input', (element) => { element.value = ''; element.dispatchEvent(new Event('input', {
    bubbles: true,
  })); });
  await connect(second, removed);
  await rm(removed, {
    recursive: true,
  });
  await second.click('#manager-projects button[aria-label="Close projects"]');
  await openProjects(second);
  let removedSelector = `#manager-project-list [data-project="${projectId(removed)}"]`;
  await second.waitForFunction((selector) => document.querySelector(selector)?.textContent?.includes('Unavailable'), {}, removedSelector);
  assert.equal(await second.$eval(`${removedSelector} button:first-child`, (element) => element.hasAttribute('disabled')), true);
  await second.locator(`${removedSelector} ::-p-aria([name="Forget connection"][role="button"])`).click();
  await second.waitForFunction((selector) => !document.querySelector(selector), {}, removedSelector);
  await assert.rejects(stat(removed), 'Forgetting a missing connection does not recreate it.');
  await second.click('#manager-projects button[aria-label="Close projects"]');
  await second.evaluate(() => Reflect.get(document.querySelector('agui-session-manager') || {}, 'connection').socket.close());
  await second.waitForFunction(() => document.querySelector('.connection')?.textContent?.includes('Disconnected'));
  await second.waitForFunction(() => document.querySelector('.connection .agui-message-text')?.textContent === 'Connected');
  await waitForProject(second, projectId(folderB));
  assert.equal(second.url(), urlB);
  await openProjects(second);
  let folderASelector = `#manager-project-list [data-project="${projectId(folderA)}"]`;
  await second.locator(`${folderASelector} ::-p-aria([name="Forget connection"][role="button"])`).click();
  await second.waitForFunction((selector) => !document.querySelector(selector), {}, folderASelector);
  await page.evaluate(async () => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    await owner.refresh();
  });
  await second.click('#manager-projects button[aria-label="Close projects"]');
  await openProjects(second);
  await second.waitForFunction((selector) => !document.querySelector(selector), {}, folderASelector);
  await second.click('#manager-projects button[aria-label="Close projects"]');
  await page.bringToFront();
  await switchProject(page, 'default');
  assert.equal(page.url(), manager.url);
  assert.equal(await generated.$eval('input[name="draft"]', (element) => element.value), draft);
  let preserved = await project.cli([
    'status',
    'desk',
  ], '');
  assert.equal(preserved.url, session.url);
  assert.equal(preserved.feedback.instanceId, session.feedback.instanceId);
  assert.equal(await readFile(configPath, 'utf8'), originalConfig);
  assert.deepEqual(errors, []);
});

test('project navigation survives session discovery failures and ignores delayed responses after reconnect', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45000,
}, async (t) => {
  let project = await temporaryManagerProject();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => { await browser?.close(); await project.close(); });
  let folder = join(project.projectDirectory, 'destination');
  await mkdir(folder);
  await project.cli([
    'status',
    'all',
  ], folder);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  let page = await browser.newPage();
  await page.goto(manager.launchUrl);
  await waitForProject(page, 'default');
  await openProjects(page);
  await connect(page, folder);
  await page.click('#manager-projects button[aria-label="Close projects"]');
  await page.evaluate(async () => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    let connection = owner.connection;
    if (!connection) { throw new Error('Missing connection.'); }
    let request = connection.request.bind(connection);
    connection.request = (operation, options) => operation === 'snapshot' ? Promise.resolve({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Fixture session discovery failure.',
      },
    }) : request(operation, options);
    owner.loaded = false;
    await owner.refresh();
  });
  await page.waitForFunction(() => !document.querySelector('#manager-project-switcher select')?.hasAttribute('disabled'));
  await page.evaluate(async (id) => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    let connection = owner.connection;
    if (!connection) { throw new Error('Missing connection.'); }
    let request = connection.request.bind(connection);
    connection.request = (operation, options) => operation === 'switch project' ? Promise.resolve({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Fixture destination launch failure.',
      },
    }) : request(operation, options);
    try { await owner.projects?.run('switch project', id); }
    finally { connection.request = request; }
  }, projectId(folder));
  await page.waitForFunction(() => document.querySelector('#manager-project-navigation [role="alert"]')?.textContent?.includes('Fixture destination launch failure.'));
  assert.equal(page.url(), manager.url, 'A failed switch retains the current manager.');
  assert.equal(await page.evaluate(() => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    return owner.projects?.listing?.currentProjectId;
  }), 'default');
  await switchProject(page, projectId(folder));
  let settled = await page.evaluate(async () => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    let connection = owner.connection;
    if (!connection) { throw new Error('Missing connection.'); }
    clearInterval(owner.interval);
    let request = connection.request.bind(connection);
    /** @type {(value: import('../../types/manager.js').ManagerResult) => void} */
    let resolve = () => {};
    let calls = 0;
    connection.request = (operation, options) => {
      if (operation !== 'describe') { return request(operation, options); }
      calls += 1;
      return new Promise((done) => { resolve = done; });
    };
    let pending = owner.act('describe', 'old-session');
    let socket = connection.socket;
    await new Promise((done) => { socket?.addEventListener('close', done, {
      once: true,
    }); socket?.close(); });
    resolve({
      ok: true,
      description: {
        sessionId: 'old-session',
        title: 'Old response',
        summary: '',
        htmlPath: '',
        descriptionPath: '',
        description: 'Stale content from before reconnect.',
      },
    });
    await pending;
    connection.request = request;
    return {
      calls,
      descriptionOpen: owner.$.descriptionOpen,
      description: owner.$.description,
    };
  });
  assert.equal(settled.calls, 1, 'A delayed operation is not replayed.');
  assert.equal(settled.descriptionOpen, false);
  assert.equal(settled.description, '');
  await page.waitForFunction(() => document.querySelector('.connection .agui-message-text')?.textContent === 'Connected');
  await waitForProject(page, projectId(folder));
});

test('Open folder targets the selected or listed project and recovers from a desktop failure', {
  skip: !executablePath && 'Set AGUI_TEST_BROWSER_PATH to an installed Chrome executable.',
  timeout: 45000,
}, async (t) => {
  let project = await temporaryManagerProject();
  /** @type {import('puppeteer-core').Browser | undefined} */
  let browser;
  t.after(async () => { await browser?.close(); await project.close(); });
  let folder = join(project.projectDirectory, 'team folder');
  await mkdir(folder);
  await project.cli([
    'status',
    'all',
  ], folder);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  let page = await browser.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(manager.launchUrl);
  await waitForProject(page, 'default');
  await page.evaluate((path) => {
    let owner = /** @type {import('../../src/manager/page/index.js').SessionManager} */ (document.querySelector('agui-session-manager'));
    let connection = owner.connection;
    if (!connection) { throw new Error('Missing connection.'); }
    let request = connection.request.bind(connection);
    /** @type {string[]} */
    let requests = [];
    Reflect.set(window, 'folderRequests', requests);
    connection.request = (operation, options) => {
      if (operation !== 'open folder') { return request(operation, options); }
      requests.push(options?.projectId || '');
      let folderPath = options?.projectId === 'default' ? owner.snapshot?.storage.defaultFolder : path;
      return Promise.resolve(Reflect.get(window, 'folderFailure') ? {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Fixture desktop failure. Folder: ${folderPath}`,
        },
      } : {
        ok: true,
        folderPath,
      });
    };
  }, folder);
  await openProjects(page);
  await connect(page, folder);
  assert.deepEqual(await page.evaluate(() => Reflect.get(window, 'folderRequests')), [], 'Discovery and connection do not open OS windows.');
  await page.click('#manager-projects button[aria-label="Close projects"]');
  await page.click('#manager-open-project');
  await page.waitForFunction((path) => document.querySelector('.notice')?.textContent?.includes(`Requested opening ${path}`), {}, folder);
  assert.equal(page.url(), manager.url, 'Opening a selected folder does not switch the manager scope.');
  await openProjects(page);
  await page.locator('#manager-project-list [data-project="default"] ::-p-aria([name="Open folder"][role="button"])').click();
  await page.waitForFunction(() => !document.querySelector('#manager-connect-project input')?.hasAttribute('disabled'));
  await page.evaluate(() => Reflect.set(window, 'folderFailure', true));
  await page.locator(`#manager-project-list [data-project="${projectId(folder)}"] ::-p-aria([name="Open folder"][role="button"])`).click();
  await page.waitForFunction((path) => document.querySelector('#manager-projects [role="alert"]')?.textContent?.includes(`Fixture desktop failure. Folder: ${path}`), {}, folder);
  await page.waitForFunction(() => !document.querySelector('#manager-connect-project input')?.hasAttribute('disabled'));
  assert.deepEqual(await page.evaluate(() => Reflect.get(window, 'folderRequests')), [
    projectId(folder),
    'default',
    projectId(folder),
  ]);
  assert.equal(page.url(), manager.url);
  await page.click('#manager-projects button[aria-label="Close projects"]');
  await switchProject(page, projectId(folder));
});
