import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTransfer, serializeTransfer, transferDocument } from '../../src/page/client/uilib/controls/data-toolbar/json.js';
import { fileLabel } from '../../src/page/client/uilib/controls/data-toolbar/files.js';
import { DATA_LIMITS } from '../../src/data/constants.js';

let targets = [{ provider: 'APP', keys: ['records', 'count'] }];
let changes = [{ provider: 'APP', values: { records: [{ name: '</script> {{literal}}', nested: [null, true, 2, 'Ж'] }], count: 0 } }];

test('portable JSON round-trips declared values without worker identities or shared metadata', () => {
  let text = serializeTransfer(changes, targets);
  let document = parseTransfer(text, targets);
  assert.deepEqual(document, { version: 1, changes });
  assert.deepEqual(parseTransfer('\uFEFF' + text, targets), document);
  document.changes[0].values.count = 9;
  assert.equal(changes[0].values.count, 0);
  assert.equal(fileLabel('C:\\fakepath\\contacts.json'), 'contacts.json');
  assert.equal(fileLabel('../../\u0000draft?.json'), 'draft.json');
  assert.equal(fileLabel('..'), 'agui-data.json');
});

test('JSON imports reject missing, extra, duplicate, reserved, unsafe, and oversized data before publication', () => {
  for (let input of [
    null, [], {}, { version: 2, changes }, { version: 1, changes, instanceId: 'not-portable' },
    { version: 1, changes: [] }, { version: 1, changes: [...changes, ...changes] },
    { version: 1, changes: [{ provider: 'APP', values: { records: [] } }] },
    { version: 1, changes: [{ provider: 'APP', values: { records: [], count: 0, extra: true } }] },
    { version: 1, changes: [{ provider: 'OTHER', values: { records: [], count: 0 } }] },
    { version: 1, changes: [{ provider: 'APP', values: { records: [], count: Infinity } }] },
  ]) { assert.throws(() => transferDocument(input, targets)); }
  for (let source of ['{broken', '{"version":1,"changes":[{"provider":"APP","values":{"__proto__":{},"count":0}}]}', ' '.repeat(DATA_LIMITS.bytes + 1)]) {
    assert.throws(() => parseTransfer(source, targets));
  }
  assert.throws(() => serializeTransfer([{ provider: 'AGUI_DATA', values: { result: null } }], [{ provider: 'AGUI_DATA', keys: ['result'] }]));
  assert.throws(() => serializeTransfer([{ provider: 'APP', values: { records: 'x'.repeat(DATA_LIMITS.bytes), count: 0 } }], targets), { code: 'TOO_LARGE' });
  assert.deepEqual(changes[0].values.count, 0);
});
