import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import { listTemplates } from '../../src/templates/catalog.js';
import { mockIconFont } from '../browser/icon-font-fixture.js';
import { CHART_RUNTIME_PATH } from '../../uilib/widgets/chart/constants.js';
import { MAP_RUNTIME_PATH } from '../../uilib/widgets/map/constants.js';

/**
 * @param {import('node:test').TestContext} t
 * @param {string} installedRoot
 * @param {string} caller
 * @param {string[]} packedFiles
 * @param {(args: string[], folder: string) => Promise<any>} cli
 */
export async function verifyPackagedTemplates(t, installedRoot, caller, packedFiles, cli) {
  let entries = await listTemplates();
  for (let path of await readdir(new URL('../../templates/', import.meta.url), {
    recursive: true,
  })) {
    if ((await stat(new URL(`../../templates/${path}`, import.meta.url))).isFile()) {
      assert.ok(packedFiles.includes(`templates/${path}`), `Packaged template source: ${path}`);
    }
  }
  let browser = await puppeteer.launch({
    executablePath: process.env.AGUI_TEST_BROWSER_PATH,
    headless: true,
  });
  t.after(() => browser.close());
  let project = join(caller, 'template project');
  await mkdir(project);
  for (let folder of [
    '',
    project,
  ]) {
    let catalog = await cli([
      'templates',
      'list',
    ], folder);
    for (let entry of entries) {
      assert.ok(catalog.templates.some((/** @type {{ id: string }} */ item) => item.id === entry.id));
      for (let extension of [
        'png',
        'json',
        'md',
      ]) {
        assert.ok(packedFiles.includes(`src/page/gallery.assets/template-previews/${entry.id}.${extension}`));
      }
      let contract = await cli([
        'templates',
        'describe',
        entry.id,
      ], folder);
      assert.equal(contract.template.id, entry.id);
      assert.equal(Object.hasOwn(contract, 'html'), false);
      let configuration = JSON.parse(await readFile(join(installedRoot, 'templates', entry.id, 'preview.json'), 'utf8'));
      configuration.APP.title = 'Packaged starter';
      if (entry.id === 'dashboard') {
        configuration.UI.chartVisible = false;
        configuration.UI.mapVisible = false;
      }
      let config = join(caller, `${entry.id} config.json`);
      await writeFile(config, JSON.stringify(configuration));
      let id = `template-${entry.id}`;
      let created = await cli([
        'templates',
        'create',
        entry.id,
        id,
        '--config',
        config,
      ], folder);
      assert.equal(created.active, false);
      assert.equal(Object.hasOwn(created, 'html'), false);
      if (folder) { assert.equal(created.htmlPath, join(folder, `${id}.html`)); }
      assert.equal(JSON.parse(await readFile(created.metadataPath, 'utf8')).template.id, entry.id);
      assert.match(await readFile(created.descriptionPath, 'utf8'), /## Data flow/);
      let page = await browser.newPage();
      await page.setViewport({
        width: 1440,
        height: 1000,
      });
      await mockIconFont(page);
      let errors = /** @type {string[]} */ ([]);
      let requests = /** @type {string[]} */ ([]);
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('request', (request) => requests.push(new URL(request.url()).pathname));
      try {
        let started = await cli([
          'start',
          id,
          '--no-open',
        ], folder);
        await page.goto(started.url);
        await page.waitForFunction(() => {
          let owner = document.querySelector('sym-context[ctx="APP"]');
          return owner && Reflect.get(owner, '$').title === 'Packaged starter';
        });
        let stylesheet = await fetch(new URL('./_assets/styles.css', started.url));
        assert.equal(stylesheet.status, 200);
        assert.match(stylesheet.headers.get('content-type') || '', /text\/css/);
        if (entry.id === 'workspace') {
          await page.locator('textarea').fill('Packaged edit');
          await page.waitForFunction(() => {
            let owner = document.querySelector('sym-context[ctx="DATA"]');
            return owner && Reflect.get(owner, '$').note === 'Packaged edit';
          });
        }
        if (entry.id === 'collection') {
          await page.waitForSelector('agui-table tbody tr[data-row-id="item-1"]');
          await page.locator('agui-tabs [role="tab"][value="cards"]').click();
          await page.waitForSelector('agui-list agui-panel[data-selected]');
          await page.locator('agui-filter .agui-filter-query input').fill('First item');
          await page.waitForFunction(() => document.querySelectorAll('agui-tab[value="cards"] agui-list agui-panel').length === 1);
        }
        if (entry.id === 'dashboard') {
          await page.waitForSelector('agui-panel dd');
          assert.equal(await page.$('agui-chart, agui-map'), null);
          assert.equal(requests.some((path) => path.endsWith(CHART_RUNTIME_PATH) || path.endsWith(MAP_RUNTIME_PATH)), false);
          await page.locator('agui-toggle ::-p-aria([name="Show chart"][role="switch"])').click();
          await page.waitForSelector('agui-chart svg');
          await page.locator('agui-toggle ::-p-aria([name="Show map"][role="switch"])').click();
          await page.waitForSelector('agui-map .leaflet-container');
        }
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
        await cli([
          'stop',
          id,
        ], folder).catch(() => {});
        await cli([
          'clear',
          id,
        ], folder);
      }
    }
  }
  await browser.close();
}
