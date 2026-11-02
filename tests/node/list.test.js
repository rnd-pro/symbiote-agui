import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveList } from '../../src/uilib/widgets/list/model.js';
import { validateSelection } from '../../src/uilib/shared/data/selection.js';
import { tableState } from './table-fixture.js';

test('list masks preserve source order and selected IDs outside the result without rewriting inputs', () => {
  let state = tableState();
  state.filteredIds = [
    'b',
    'a',
    'unknown',
  ];
  let before = structuredClone(state);
  let model = deriveList(state);
  assert.deepEqual(model.filtered.map((row) => row.id), [
    'a',
    'b',
  ]);
  assert.deepEqual(model.selected, [
    'd',
  ]);
  assert.deepEqual(state, before);
  state.filteredIds = [];
  assert.deepEqual(deriveList(state).filtered, []);
  state.filteredIds = null;
  assert.equal(deriveList(state).filtered.length, state.rows.length);
});

test('list identity and selection validation reject ambiguous and unavailable selections', () => {
  let state = tableState();
  state.rows.push(state.rows[0]);
  assert.throws(() => deriveList(state), /invalidRows/);
  state = tableState();
  state.filteredIds = [
    'a',
    'a',
  ];
  assert.throws(() => deriveList(state), /invalidState/);
  state.filteredIds = null;
  state.selection = 'single';
  assert.throws(() => validateSelection(state, [
    'a',
    'b',
  ]), /invalidState/);
  assert.throws(() => validateSelection(state, [
    'missing',
  ]), /invalidState/);
  state.selection = 'none';
  assert.deepEqual(deriveList(state).selected, []);
  assert.throws(() => validateSelection(state, []), /invalidState/);
});
