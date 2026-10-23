import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveChart, selectedIds } from '../../src/page/client/uilib/widgets/chart/model.js';
import { readChart } from '../../src/page/client/uilib/widgets/chart/reads.js';
import { chartState } from './chart-fixture.js';

test('chart models preserve zero/gaps, IDs across reorder, unrelated data, and effective selection without rewriting sources', () => {
  let state = chartState();
  let before = structuredClone(state);
  let chart = deriveChart(state);
  assert.deepEqual(chart.points[0].values, [
    0,
    5,
  ]);
  assert.equal(chart.points[0].formatted[0], '0');
  assert.deepEqual(chart.points[2].values, [
    null,
    null,
  ]);
  assert.deepEqual(chart.selected, [
    'a',
  ]);
  assert.deepEqual(state, before);
  state.rows.reverse();
  assert.equal(deriveChart(state).points.at(-1)?.id, 'a');
  assert.deepEqual(deriveChart(state).selected, [
    'a',
  ]);
  assert.throws(() => selectedIds(chart, [
    'removed',
  ]), /invalidState/);
});

test('chart formats numbers, currency, percent, and dates through declarative settings', () => {
  let state = chartState();
  state.series = [
    {
      key: 'revenue',
      valueKey: 'revenue',
      label: 'Revenue',
      format: 'currency',
      currency: 'USD',
      digits: 2,
    },
  ];
  assert.equal(deriveChart(state).points[0].formatted[0], '$0.00');
  state.series[0].format = 'percent';
  delete state.series[0].currency;
  state.rows[0].revenue = .25;
  assert.equal(deriveChart(state).points[0].formatted[0], '25.00%');
  state.xType = 'date';
  state.rows[0].name = '2026-02-28';
  assert.equal(deriveChart(state).points[0].x, 'Feb 28, 2026');
});

test('chart validation rejects ambiguous IDs, executable configuration, incompatible scales, and negative or multiple donut series', () => {
  let state = chartState();
  state.rows.push(state.rows[0]);
  assert.throws(() => deriveChart(state), /invalidRows/);
  state = chartState();
  state.series[0].color = /** @type {import('../../types/uilib-chart.js').UiChartColor} */ ('url(https://example.invalid/image)');
  assert.throws(() => deriveChart(state), /invalidSeries/);
  state = chartState();
  state.series[0].unit = 'kg';
  assert.throws(() => deriveChart(state), /invalidSeries/);
  state = chartState();
  state.type = 'donut';
  assert.throws(() => deriveChart(state), /invalidSeries/);
  state.series = state.series.slice(0, 1);
  state.rows[0].revenue = -1;
  assert.throws(() => deriveChart(state), /invalidRows/);
  state.rows[0].revenue = 0;
  state.rows[1].revenue = 0;
  assert.equal(deriveChart(state).hasData, false);
});

test('chart reads omit unrelated fields, paginate IDs, and bound oversized formatted points to 8 KiB', () => {
  let state = chartState();
  let derived = deriveChart(state);
  let chart = /** @type {import('../../src/page/client/uilib/widgets/chart/chart.js').Chart} */ (/** @type {unknown} */ ({
    requireModel: () => derived,
    text: () => 'Invalid state',
  }));
  let result = readChart(chart, false, 0, 1);
  let item = result.items[0];
  assert.ok(typeof item === 'object');
  assert.equal('private' in item, false);
  assert.equal(result.nextOffset, 1);
  assert.deepEqual(readChart(chart, true).items, [
    'a',
  ]);
  state.rows[0].name = '🧪'.repeat(20_000);
  derived = deriveChart(state);
  result = readChart(chart, false);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 8192);
  assert.deepEqual(result.items, [
    {
      id: 'a',
      truncated: true,
    },
  ]);
  assert.equal(result.nextOffset, 1);
});
