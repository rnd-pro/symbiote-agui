import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { connectorFixture } from './connector-fixture.js';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';

test('manager connector controls validate scope, review without execution, and explicitly grant or revoke access', async (t) => {
  let f = await connectorFixture(t);
  await f.attach();
  let operations = new ManagerOperations();
  let request = {
    id: randomUUID(),
    operation: 'connector status',
    sessionId: 'backend',
  };
  let status = await operations.dispatch(request);
  assert.equal(status.ok, true);
  assert.equal(status.connectorSettings?.instanceId, null);
  assert.deepEqual(status.connectorSettings?.status.inspection[0].configuredSources, []);
  /** @param {unknown} change */
  let update = (change) => operations.dispatch({
    ...request,
    id: randomUUID(),
    operation: 'connector change',
    connectorInstanceId: null,
    confirm: true,
    connectorChange: change,
  });
  let reviewed = await update({
    command: 'review',
    action: 'save',
  });
  assert.ok(reviewed.connectorSettings?.review?.source?.includes('context.verified'));
  assert.equal(reviewed.connectorSettings?.review?.requirement.revision, f.prepared.revision);
  let granted = await update({
    command: 'grant',
    action: 'save',
    revision: f.prepared.revision,
    source: 'agui',
  });
  assert.equal(granted.ok, true);
  assert.deepEqual(granted.connectorSettings?.status.inspection[0].configuredSources, [
    'agui',
  ]);
  assert.ok(!JSON.stringify(granted).includes('grantId'));
  assert.ok(!JSON.stringify(granted).includes(f.collection));
  let revoked = await update({
    command: 'revoke',
    action: 'save',
  });
  assert.deepEqual(revoked.connectorSettings?.status.inspection[0].configuredSources, []);
  await assert.rejects(readFile(f.log), {
    code: 'ENOENT',
  });
  for (let fields of [
    {
      operation: 'snapshot',
      connectorChange: {},
    },
    {
      operation: 'connector status',
      sessionId: 'backend',
      all: true,
    },
    {
      operation: 'connector change',
      sessionId: 'backend',
      confirm: true,
      connectorChange: {},
    },
    {
      operation: 'connector change',
      sessionId: 'backend',
      confirm: true,
      connectorInstanceId: null,
      connectorChange: {
        command: 'update',
        action: 'save',
        cwd: '/untrusted',
      },
    },
  ]) {
    assert.throws(() => validateManagerRequest({
      id: randomUUID(),
      ...fields,
    }));
  }
  let stale = await operations.dispatch({
    ...request,
    id: randomUUID(),
    operation: 'connector change',
    confirm: true,
    connectorInstanceId: randomUUID(),
    connectorChange: {
      command: 'detach',
      action: 'save',
    },
  });
  assert.equal(stale.ok, false);
});
