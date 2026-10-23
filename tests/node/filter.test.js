import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveFilter } from '../../src/page/client/uilib/widgets/filter/model.js';
import { tableState } from './table-fixture.js';

/** @returns {import('../../types/uilib-filter.js').UiFilterState} */
function state() {
  let input = tableState();
  return {
    ...input,
    fields: input.columns,
    value: {},
    query: '',
  };
}

test('filters combine with AND, preserve zero/false, use locale-aware search, and include an entire upper date bound', () => {
  let input = state();
  input.value = {
    active: 'false',
    score: {
      min: 0,
      max: 10,
    },
    date: {
      max: '2026-02-28',
    },
  };
  assert.deepEqual(deriveFilter(input).ids, [
    'a',
  ]);
  input.value = {};
  input.locale = 'tr';
  input.rows[0].name = 'İzmir';
  input.query = 'izmir';
  assert.equal(deriveFilter(input).ids[0], 'a');
});

test('standalone filtering rejects invalid identities, field types, options, and bounds', () => {
  let input = state();
  let original = structuredClone(input.rows);
  assert.deepEqual(deriveFilter(input).ids, original.map((row) => row.id));
  assert.deepEqual(input.rows, original);
  input.rows.push(input.rows[0]);
  assert.throws(() => deriveFilter(input), /invalidRows/);
  input = state();
  input.value = {
    score: {
      min: 10,
      max: 0,
    },
  };
  assert.throws(() => deriveFilter(input), /invalidState/);
  input.value = {
    active: 'unknown',
  };
  assert.throws(() => deriveFilter(input), /invalidState/);
  input = state();
  input.fields[0].filter = 'range';
  assert.throws(() => deriveFilter(input), /invalidFields/);
});
