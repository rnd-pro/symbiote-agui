import assert from 'node:assert/strict';
import test from 'node:test';
import { listTemplates, loadTemplate } from '../../src/templates/catalog.js';
import { renderTemplate } from '../../src/templates/render.js';

test('collection and dashboard starters have empty defaults and self-contained, discoverable contracts', async () => {
  let entries = await listTemplates();
  for (let id of [
    'workspace',
    'collection',
    'dashboard',
  ]) {
    assert.ok(entries.some((entry) => entry.id === id));
    let template = await loadTemplate(id);
    let rendered = await renderTemplate(id);
    assert.deepEqual(rendered.configuration, template.defaults);
    assert.doesNotMatch(rendered.html, /<script[^>]*type="module"/);
    assert.ok(template.descriptor.configuration.$defs);
  }
  let collection = await renderTemplate('collection');
  assert.deepEqual(collection.configuration.DATA.records, []);
  let dashboard = await renderTemplate('dashboard');
  assert.deepEqual(dashboard.configuration.DATA.metrics, []);
  assert.equal(dashboard.configuration.UI.chartVisible, false);
  assert.equal(dashboard.configuration.UI.mapVisible, false);
  assert.equal(dashboard.configuration.DATA.mapTiles, null);
});

test('collection configuration uses native validation for record identity, fields, filters and selection', async () => {
  let row = {
    id: 'one',
    title: 'One',
  };
  for (let input of [
    {
      DATA: {
        records: [
          row,
          row,
        ],
      },
    },
    {
      DATA: {
        columns: [
          {
            key: 'title',
            label: 'Title',
            type: 'invalid',
          },
        ],
      },
    },
    {
      UI: {
        filters: {
          missing: 'value',
        },
      },
    },
    {
      UI: {
        selectedIds: [
          'missing',
        ],
      },
    },
    {
      APP: {
        palette: 'missing',
      },
    },
  ]) {
    await assert.rejects(renderTemplate('collection', input), {
      code: 'INVALID_INPUT',
    });
  }
});

test('dashboard validates metrics, series and map settings even for disabled widget regions', async () => {
  for (let input of [
    {
      DATA: {
        metrics: [
          {
            id: 'one',
            label: 'One',
            value: 1,
          },
          {
            id: 'one',
            label: 'Duplicate',
            value: 2,
          },
        ],
      },
    },
    {
      DATA: {
        chartSeries: [],
      },
    },
    {
      APP: {
        chartType: 'donut',
      },
      DATA: {
        chartRows: [
          {
            id: 'negative',
            value: -1,
          },
        ],
      },
    },
    {
      UI: {
        mapView: {
          center: [
            0,
            0,
          ],
          zoom: 99,
        },
      },
    },
    {
      DATA: {
        mapTiles: {
          url: 'http://example.test/{z}/{x}/{y}.png',
          attribution: 'Example',
        },
      },
    },
  ]) {
    await assert.rejects(renderTemplate('dashboard', input), {
      code: 'INVALID_INPUT',
    });
  }
});
