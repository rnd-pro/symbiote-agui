import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveKanban, moveRecord, recordText } from '../../src/page/client/uilib/widgets/kanban/model.js';
import { readKanban } from '../../src/page/client/uilib/widgets/kanban/reads.js';

/** @returns {import('../../types/uilib-kanban.js').UiKanbanState} */
function state() {
  return {
    value: [
      {
        key: 'a',
        title: 'Alpha',
        stage: 'todo',
        details: 'First',
        amount: 0,
        nested: {
          retained: true,
        },
      },
      {
        key: 'b',
        title: false,
        stage: 'done',
      },
      {
        key: 'c',
        title: 0,
        stage: 'legacy',
      },
      {
        key: 'd',
        title: 'No stage',
      },
    ],
    columns: [
      {
        value: 'todo',
        label: 'To do',
      },
      {
        value: 'done',
        label: 'Done',
      },
      {
        value: 'locked',
        label: 'Locked',
        disabled: true,
      },
    ],
    idKey: 'key',
    statusKey: 'stage',
    titleKey: 'title',
    descriptionKey: 'details',
    label: 'Work',
    texts: {
      unassigned: 'Unassigned',
    },
    disabled: false,
    readonly: false,
    loading: false,
    error: '',
  };
}

test('kanban preserves unknown statuses, empty columns, source order, and unrelated record fields', () => {
  let input = state();
  let model = deriveKanban(input);
  assert.deepEqual(model.groups.map((group) => group.rows.map((row) => row.key)), [
    [
      'a',
    ],
    [
      'b',
    ],
    [],
    [
      'c',
      'd',
    ],
  ]);
  assert.equal(model.groups.at(-1)?.label, 'Unassigned');
  let original = structuredClone(input.value);
  let moved = moveRecord(model, 'a', 'done');
  assert.equal(moved.changed, true);
  assert.notEqual(moved.value, input.value);
  assert.notEqual(moved.value[0], input.value[0]);
  assert.equal(moved.value[0].nested, input.value[0].nested);
  assert.equal(moved.value[1], input.value[1]);
  assert.equal(moved.value[0].amount, 0);
  assert.deepEqual(moved.value.map((row) => row.key), input.value.map((row) => row.key));
  assert.deepEqual(input.value, original);
  let noop = moveRecord(model, 'b', 'done');
  assert.equal(noop.changed, false);
  assert.equal(noop.value, input.value);
  assert.equal(recordText(false), 'false');
  assert.equal(recordText(0), '0');
  assert.equal(recordText({}), '');
});

test('kanban rejects duplicate IDs, identity-field edits, invalid destinations, and duplicate columns', () => {
  let input = state();
  let model = deriveKanban(input);
  for (let status of [
    'unknown',
    'locked',
    '',
  ]) { assert.throws(() => moveRecord(model, 'a', status), /invalidState/); }
  assert.throws(() => moveRecord(model, 'missing', 'done'), /invalidState/);
  input.value.push(input.value[0]);
  assert.throws(() => deriveKanban(input), /invalidRows/);
  input = state();
  input.statusKey = input.idKey;
  assert.throws(() => deriveKanban(input), /invalidState/);
  input = state();
  input.columns.push(input.columns[0]);
  assert.throws(() => deriveKanban(input), /invalidColumns/);
  input = state();
  input.columns[0].value = '';
  assert.throws(() => deriveKanban(input), /invalidColumns/);
});

test('kanban reads stay within 8 KiB, omit unrelated fields, and paginate unassigned cards', () => {
  let input = state();
  let model = deriveKanban(input);
  let board = /** @type {import('../../src/page/client/uilib/widgets/kanban/kanban.js').Kanban} */ (/** @type {unknown} */ ({
    requireModel: () => model,
    text: (/** @type {string} */ key) => key === 'untitled' ? 'Untitled card' : 'Invalid state',
  }));
  assert.equal('nested' in readKanban(board).items[0], false);
  let unassigned = readKanban(board, '', 0, 1);
  assert.equal(unassigned.items[0].id, 'c');
  assert.equal(unassigned.items[0].title, '0');
  assert.equal(unassigned.nextOffset, 1);
  assert.equal(readKanban(board, '', 1).items[0].id, 'd');
  assert.throws(() => readKanban(board, 'unknown'), /Invalid state/);
  input.value[0].title = '';
  assert.equal(readKanban(board).items[0].title, 'Untitled card');
  input.value[0].title = '🧪'.repeat(20_000);
  let first = readKanban(board);
  assert.ok(Buffer.byteLength(JSON.stringify(first)) <= 8192);
  assert.deepEqual(first.items, [
    {
      id: 'a',
      truncated: true,
    },
  ]);
  assert.equal(first.nextOffset, 1);
  assert.equal(readKanban(board, undefined, 1).items.length, 3);
  input.loading = true;
  assert.deepEqual(readKanban(board).items, []);
});
