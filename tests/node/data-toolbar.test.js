import assert from 'node:assert/strict';
import test from 'node:test';
import { selectSavedData, sameSubmission } from '../../src/page/client/uilib/controls/data-toolbar/saved-data.js';

test('saved reads paginate cloned JSON, reject inherited paths, and enforce the byte limit', () => {
  let reference = { commitId: 'commit', instanceId: 'worker', markupRevision: 1, revision: 'revision', provider: 'APP', key: 'records' };
  let baseline = [{ provider: 'APP', values: { records: [{ text: 'x'.repeat(9000) }, { text: 'second' }] } }];
  assert.throws(() => selectSavedData(baseline, { ...reference, limit: 1 }), /8 KiB/);
  let result = selectSavedData(baseline, { ...reference, path: ['0', 'text'], limit: 100 });
  assert.equal(result.data, 'x'.repeat(100));
  assert.equal(result.nextOffset, 100);
  let page = selectSavedData(baseline, { ...reference, offset: 1, limit: 1 });
  assert.deepEqual(page.data, [{ text: 'second' }]);
  assert.equal(page.nextOffset, null);
  assert.ok(Array.isArray(page.data));
  page.data.length = 0;
  assert.equal(baseline[0].values.records.length, 2);
  assert.throws(() => selectSavedData(baseline, { ...reference, path: ['__proto__'] }), /path/);
  assert.throws(() => selectSavedData(baseline, { ...reference, key: 'unrelated' }), /Undeclared/);
});

test('submission references require commit, worker, markup, and data revisions to agree', () => {
  let reference = { commitId: 'commit', instanceId: 'worker', markupRevision: 1, revision: 'revision' };
  assert.equal(sameSubmission(reference, { ...reference }), true);
  for (let key of Object.keys(reference)) {
    assert.equal(sameSubmission(reference, { ...reference, [key]: 'changed' }), false);
  }
});
