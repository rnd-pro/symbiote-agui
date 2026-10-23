import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveTable, selectedIds, toggleFiltered } from '../../src/page/client/uilib/widgets/table/model.js';
import { cellText } from '../../src/page/client/uilib/shared/data/values.js';
import { readTable } from '../../src/page/client/uilib/widgets/table/reads.js';

import { tableState as state } from './table-fixture.js';

test('typed table sorting is stable, leaves invalid values last in either direction, and never mutates records', () => {
  let input = state();
  let original = structuredClone(input);
  input.sort = {
    key: 'score',
    direction: 'ascending',
  };
  assert.deepEqual(deriveTable(input).filtered.map((row) => row.id), [
    'e',
    'a',
    'b',
    'c',
    'd',
    'f',
  ]);
  input.sort.direction = 'descending';
  assert.deepEqual(deriveTable(input).filtered.map((row) => row.id), [
    'b',
    'c',
    'a',
    'e',
    'd',
    'f',
  ]);
  assert.deepEqual(input.rows, original.rows);
  assert.equal(cellText(input.rows[0], input.columns[1], input), '0');
  assert.equal(cellText(input.rows[0], input.columns[2], input), 'No');
});

test('filtered selection spans pages, preserves outside IDs, and prunes replacement data only in the effective view', () => {
  let input = state();
  input.filteredIds = [
    'a',
    'b',
    'c',
  ];
  let model = deriveTable(input);
  assert.equal(model.visible.length, 2);
  assert.deepEqual(toggleFiltered(model), [
    'd',
    'a',
    'b',
    'c',
  ]);
  input.value = toggleFiltered(model);
  assert.deepEqual(toggleFiltered(deriveTable(input)), [
    'd',
  ]);
  input.rows = input.rows.filter((row) => row.id !== 'a');
  assert.deepEqual(deriveTable(input).selected, [
    'd',
    'b',
    'c',
  ]);
  assert.ok(input.value.includes('a'));
  assert.throws(() => selectedIds(deriveTable(input), [
    'a',
  ]), /invalidState/);
  input.selection = 'single';
  assert.deepEqual(deriveTable(input).selected, [
    'd',
  ]);
  assert.throws(() => selectedIds(deriveTable(input), [
    'b',
    'c',
  ]), /invalidState/);
});

test('invalid identity, result masks, sort keys, and columns cannot produce ambiguous table edits', () => {
  let input = state();
  input.rows.push(input.rows[0]);
  assert.throws(() => deriveTable(input), /invalidRows/);
  input = state();
  input.filteredIds = [
    'a',
    'a',
  ];
  assert.throws(() => deriveTable(input), /invalidState/);
  input = state();
  input.sort = {
    key: 'unknown',
    direction: 'ascending',
  };
  assert.throws(() => deriveTable(input), /invalidState/);
  input = state();
  input.columns.push(input.columns[0]);
  assert.throws(() => deriveTable(input), /invalidColumns/);
});

test('table reads paginate within 8 KiB and identify oversized rows without returning their contents', () => {
  let input = state();
  input.rows[0].name = '🧪'.repeat(20_000);
  let model = deriveTable(input);
  let table = /** @type {import('../../src/page/client/uilib/widgets/table/table.js').Table} */ (/** @type {unknown} */ ({
    requireModel: () => model,
    text: () => 'Invalid request',
  }));
  let first = readTable(table, false);
  assert.ok(Buffer.byteLength(JSON.stringify(first)) <= 8192);
  assert.deepEqual(first.items, [
    {
      id: 'a',
      selected: false,
      truncated: true,
    },
  ]);
  assert.equal(first.nextOffset, 1);
  let second = readTable(table, false, 1);
  assert.equal(second.nextOffset, null);
  assert.equal(second.items.length, 1);
  assert.deepEqual(readTable(table, true).items, [
    'd',
  ]);
});

test('table consumes an optional result mask in source order without owning filter state', () => {
  let input = state();
  input.filteredIds = [
    'c',
    'a',
    'stale',
  ];
  assert.deepEqual(deriveTable(input).filtered.map((row) => row.id), [
    'a',
    'c',
  ]);
  input.filteredIds = [];
  assert.equal(deriveTable(input).filtered.length, 0);
  input.filteredIds = null;
  assert.equal(deriveTable(input).filtered.length, input.rows.length);
});
