import assert from 'node:assert/strict';
import test from 'node:test';
import { selectSavedData, sameSubmission } from '../../src/page/client/uilib/controls/data-toolbar/saved-data.js';
import { toolbarIndicator } from '../../src/page/client/uilib/controls/data-toolbar/indicator.js';
import { toolbarNotices } from '../../src/page/client/uilib/controls/data-toolbar/notices.js';

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

test('partial saves keep success, pending delivery warnings, and independent transfer failures separate', () => {
  let reference = {
    commitId: 'commit',
    instanceId: 'worker',
    markupRevision: 1,
    revision: 'revision',
  };
  /** @type {import('../../types/data-toolbar.js').ToolbarNoticesInput} */
  let input = {
    viewer: false,
    dirty: true,
    stale: false,
    issue: '',
    submission: {
      reference,
      changes: [],
      result: {
        ...reference,
        state: 'committed',
      },
      delivery: {
        submissionId: reference.commitId,
        instanceId: reference.instanceId,
        state: 'rejected',
        failure: {
          code: 'DISABLED',
          message: 'Not rendered directly.',
        },
      },
    },
    transfer: {
      operation: 'export',
      state: 'error',
      message: '',
      failure: {
        code: 'EXPORT_FAILED',
        message: 'Not rendered directly.',
      },
    },
  };
  let notices = toolbarNotices(input, (key) => key);
  assert.deepEqual(notices.local, {
    tone: 'success',
    message: 'saved',
  });
  assert.deepEqual(notices.delivery, {
    tone: 'warning',
    message: 'delivery.rejected feedback.DISABLED',
  });
  assert.deepEqual(notices.transfer, {
    tone: 'error',
    message: 'transfer.EXPORT_FAILED',
  });
  assert.equal(notices.edit.tone, 'warning');
  assert.ok(input.submission?.delivery);
  assert.ok(input.submission.delivery.failure);
  input.submission.delivery.failure.code = 'COMMAND_FAILED';
  assert.equal(toolbarNotices(input, (key) => key).delivery.tone, 'error');
  input.submission.delivery.state = 'accepted';
  delete input.submission.delivery.failure;
  notices = toolbarNotices(input, (key) => key);
  assert.equal(notices.delivery.tone, 'success');
  assert.equal(notices.external.tone, 'warning', 'Confirmed delivery does not confirm external persistence.');
  assert.equal(notices.transfer.tone, 'error');
  input.submission.external = {
    ...reference,
    state: 'unknown',
    message: 'Verify destination before retrying.',
  };
  notices = toolbarNotices(input, (key) => key);
  assert.equal(notices.external.tone, 'warning');
  assert.match(notices.external.message, /Verify destination/);
  assert.equal(notices.local.tone, 'success');
  assert.ok(input.transfer);
  delete input.transfer.failure;
  assert.equal(toolbarNotices(input, (key) => key).transfer.tone, 'error');
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
