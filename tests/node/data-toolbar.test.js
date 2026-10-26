import assert from 'node:assert/strict';
import test from 'node:test';
import { selectSavedData, sameSubmission } from '../../src/page/client/uilib/controls/data-toolbar/saved-data.js';
import { toolbarIndicator } from '../../src/page/client/uilib/controls/data-toolbar/indicator.js';

test('toolbar status distinguishes local saving, delivery, and external verification without hiding newer drafts', () => {
  /** @type {import('../../types/data-toolbar.js').ToolbarIndicatorInput} */
  let input = {
    viewer: false,
    connected: true,
    dirty: false,
    stale: false,
    issue: false,
  };
  let reference = {
    commitId: 'commit',
    instanceId: 'worker',
    markupRevision: 1,
    revision: 'revision',
  };
  assert.equal(toolbarIndicator(input).state, 'clean');
  input.dirty = true;
  assert.equal(toolbarIndicator(input).state, 'dirty');
  input.submission = {
    reference,
    changes: [],
  };
  assert.equal(toolbarIndicator(input).state, 'busy');
  input.submission.result = {
    ...reference,
    state: 'committed',
  };
  input.dirty = false;
  assert.equal(toolbarIndicator(input).state, 'saved');
  input.submission.delivery = {
    submissionId: reference.commitId,
    instanceId: reference.instanceId,
    state: 'queued',
  };
  assert.equal(toolbarIndicator(input).state, 'busy');
  input.submission.delivery.state = 'accepted';
  assert.equal(toolbarIndicator(input).state, 'pending');
  input.submission.external = {
    ...reference,
    state: 'verified',
  };
  assert.equal(toolbarIndicator(input).state, 'verified');
  input.dirty = true;
  assert.equal(toolbarIndicator(input).state, 'dirty', 'An old acknowledgement cannot mark a newer draft verified.');
  input.submission.delivery.state = 'rejected';
  assert.equal(toolbarIndicator(input).state, 'dirty');
  input.dirty = false;
  assert.equal(toolbarIndicator(input).state, 'delivery-unavailable');
  input.submission.external.state = 'unknown';
  assert.equal(toolbarIndicator(input).state, 'uncertain');
  input.submission.external.state = 'failed';
  assert.equal(toolbarIndicator(input).state, 'error');
  delete input.submission;
  input.connected = false;
  assert.equal(toolbarIndicator(input).state, 'disconnected');
  input.viewer = true;
  input.connected = true;
  assert.equal(toolbarIndicator(input).state, 'viewer');
});

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
