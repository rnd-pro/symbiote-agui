import assert from 'node:assert/strict';
import test from 'node:test';
import { templatePage } from './template-fixture.js';
import { CHART_RUNTIME_PATH } from '../../uilib/widgets/chart/constants.js';
import { MAP_RUNTIME_PATH } from '../../uilib/widgets/map/constants.js';

test('collection starter shares filtering and single/multiple selection between table, cards, and details', {
  timeout: 60_000,
}, async (t) => {
  let {
    page,
    errors,
    url,
  } = await templatePage(t, 'collection', {
    DATA: {
      records: [
        {
          id: 'a',
          title: 'Alpha',
          status: 'Ready',
          description: 'Alpha details',
        },
        {
          id: 'b',
          title: 'Beta',
          status: 'Review',
          description: 'Beta details',
        },
      ],
    },
  });
  await page.goto(url);
  await page.waitForSelector('agui-table tbody tr[data-row-id="a"]');
  await page.locator('agui-theme-selector > button:not(:disabled)').click();
  await page.locator('.agui-theme-option[value="ocean"]').click();
  await page.waitForFunction(() => document.body.dataset.palette === 'ocean');
  await page.keyboard.press('Escape');
  await page.locator('agui-table tr[data-row-id="a"] td[data-column="title"]').click();
  await page.waitForFunction(() => document.querySelector('agui-sidebar[side="end"]')?.getAttribute('hidden') === null);
  await page.locator('agui-tabs [role="tab"][value="cards"]').click();
  assert.equal(await page.$eval('agui-list agui-panel[data-selected] h2', (heading) => heading.textContent), 'Alpha');
  await page.locator('agui-list agui-panel ::-p-text(Beta)').click();
  await page.waitForFunction(() => {
    let owner = document.querySelector('sym-context[ctx="UI"]');
    return owner && Reflect.get(owner, '$').selectedIds.join(',') === 'b';
  });
  await page.select('agui-sidebar-block[label="Selection"] agui-select select', 'multiple');
  await page.waitForFunction(() => {
    let owner = document.querySelector('sym-context[ctx="UI"]');
    return owner && Reflect.get(owner, '$').selectedIds.length === 0;
  });
  await page.locator('agui-list agui-panel ::-p-text(Alpha)').click();
  await page.locator('agui-list agui-panel ::-p-text(Beta)').click();
  await page.waitForFunction(() => {
    let owner = document.querySelector('sym-context[ctx="UI"]');
    return owner && Reflect.get(owner, '$').selectedCount === 2;
  });
  await page.locator('agui-filter .agui-filter-query input').fill('Alpha');
  await page.waitForFunction(() => document.querySelectorAll('agui-tab[value="cards"] agui-list agui-panel').length === 1);
  await page.locator('agui-sidebar[side="end"] ::-p-aria([name="View details"][role="button"])').click();
  await page.waitForSelector('agui-dialog dialog[open]');
  assert.match(await page.$eval('agui-dialog dialog', (dialog) => dialog.textContent || ''), /Beta details/);
  await page.keyboard.press('Escape');
  await page.locator('agui-sidebar[side="end"] ::-p-aria([name="Clear selection"][role="button"])').click();
  await page.waitForFunction(() => document.querySelector('agui-sidebar[side="end"]')?.hasAttribute('hidden'));
  assert.deepEqual(errors, []);
});

test('dashboard starter mounts heavy widgets on demand and keeps metric and map updates declarative', {
  timeout: 60_000,
}, async (t) => {
  let {
    page,
    errors,
    url,
  } = await templatePage(t, 'dashboard', {
    DATA: {
      metrics: [
        {
          id: 'total',
          label: 'Total',
          value: 42,
        },
      ],
      chartRows: [
        {
          id: 'one',
          label: 'One',
          value: 12,
        },
      ],
      mapRows: [
        {
          id: 'point',
          label: 'Point',
          latitude: 0,
          longitude: 0,
        },
      ],
    },
  });
  let requested = /** @type {string[]} */ ([]);
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('agui-panel dd')?.textContent === '42');
  assert.equal(await page.$('agui-chart, agui-map'), null);
  assert.equal(requested.some((path) => path.endsWith(CHART_RUNTIME_PATH) || path.endsWith(MAP_RUNTIME_PATH)), false);
  await page.locator('agui-toggle ::-p-aria([name="Show chart"][role="switch"])').click();
  await page.waitForSelector('agui-chart svg');
  assert.ok(requested.some((path) => path.endsWith(CHART_RUNTIME_PATH)));
  assert.equal(requested.some((path) => path.endsWith(MAP_RUNTIME_PATH)), false);
  await page.locator('agui-toggle ::-p-aria([name="Show map"][role="switch"])').click();
  await page.waitForSelector('agui-map .leaflet-container');
  assert.ok(requested.some((path) => path.endsWith(MAP_RUNTIME_PATH)));
  await page.locator('agui-map ::-p-aria([name="Zoom in"][role="button"])').click();
  await page.waitForFunction(() => {
    let owner = document.querySelector('sym-context[ctx="UI"]');
    return owner && Reflect.get(owner, '$').mapView.zoom > 2;
  });
  await page.locator('agui-toggle ::-p-aria([name="Show chart"][role="switch"])').click();
  await page.locator('agui-toggle ::-p-aria([name="Show map"][role="switch"])').click();
  await page.waitForFunction(() => !document.querySelector('agui-chart, agui-map'));
  assert.deepEqual(errors, []);
});
