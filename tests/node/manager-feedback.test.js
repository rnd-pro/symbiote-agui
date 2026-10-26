import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { reserveSession, writeSession } from '../../src/sessions/store.js';
import { startControlServer } from '../../src/server/control-server.js';
import { closeServer } from '../../src/shared/server.js';
import { requestSession } from '../../src/sessions/client.js';
import { temporaryState } from './state-fixture.js';

test('feedback management rejects bulk targets, unrelated fields, and writes without worker identity', () => {
  for (let input of [
    {
      operation: 'feedback settings',
      all: true,
    },
    {
      operation: 'feedback disable',
      sessionId: 'desk',
    },
    {
      operation: 'feedback settings',
      sessionId: 'desk',
      command: {},
    },
    {
      operation: 'snapshot',
      conversationId: 'chat',
    },
    {
      operation: 'feedback configure',
      sessionId: '../other',
      instanceId: randomUUID(),
      conversationId: 'chat',
      command: {},
    },
  ]) {
    assert.throws(() => validateManagerRequest({
      id: randomUUID(),
      ...input,
    }));
  }
});

test('manager privately configures and disables feedback without executing on configure or changing ownership', async (t) => {
  let state = await temporaryState();
  let record = await reserveSession('feedback-manager');
  record.pid = process.pid;
  let runtime = new SessionRuntime(record);
  let control = await startControlServer(record, () => runtime.status(), () => runtime.close(), {
    feedbackConfigure: (input) => runtime.configureFeedback(input),
    feedbackStatus: () => runtime.feedbackStatus(),
    feedbackSettings: () => runtime.feedback.settings(),
    feedbackDisable: (input) => runtime.disableFeedback(input),
  });
  t.after(async () => {
    await runtime.close();
    await closeServer(control.server);
    await state.close();
  });
  record.controlUrl = control.url;
  await writeSession(record);
  let operations = new ManagerOperations();
  let log = join(state.directory, 'delivery.jsonl');
  let command = {
    executable: process.execPath,
    args: [
      fileURLToPath(new URL('./feedback-fixture.js', import.meta.url)),
      'record',
      log,
    ],
    input: /** @type {const} */ ({
      channel: 'stdin',
    }),
  };
  let initial = await operations.dispatch({
    id: randomUUID(),
    operation: 'feedback settings',
    sessionId: record.sessionId,
  });
  assert.equal(initial.ok, true);
  assert.equal(initial.feedbackSettings?.command, null);
  let request = {
    id: randomUUID(),
    operation: 'feedback configure',
    sessionId: record.sessionId,
    instanceId: record.instanceId,
    conversationId: 'manager-chat',
    command,
  };
  let configured = await operations.dispatch(request);
  assert.equal(configured.ok, true);
  assert.deepEqual(configured.feedbackSettings?.command, command);
  assert.deepEqual(await operations.dispatch(request), configured);
  await assert.rejects(readFile(log), {
    code: 'ENOENT',
  });
  assert.equal(JSON.stringify(await operations.snapshot()).includes(log), false);
  assert.equal(JSON.stringify(await requestSession(record, 'feedback')).includes('manager-chat'), false);
  assert.equal((await fetch(`${control.url}/feedback/settings`)).status, 401);
  assert.equal((await fetch(`${control.url}/feedback-settings/`)).status, 401);
  let delivered = once(runtime.feedback, 'delivery');
  runtime.feedback.submit({
    submissionId: randomUUID(),
    instanceId: record.instanceId,
    event: {
      type: 'fixture.save',
      source: 'manager-feedback-test',
      data: null,
    },
  });
  assert.equal((await delivered)[0].state, 'accepted');
  assert.equal(JSON.parse(await readFile(log, 'utf8')).conversationId, 'manager-chat');
  let stale = await operations.dispatch({
    ...request,
    id: randomUUID(),
    instanceId: randomUUID(),
  });
  assert.equal(stale.ok, false);
  assert.match(stale.error?.message || '', /restarted/);
  let rebound = await operations.dispatch({
    ...request,
    id: randomUUID(),
    conversationId: 'another-chat',
  });
  assert.equal(rebound.ok, false);
  let disabled = await operations.dispatch({
    id: randomUUID(),
    operation: 'feedback disable',
    sessionId: record.sessionId,
    instanceId: record.instanceId,
  });
  assert.equal(disabled.ok, true);
  assert.equal(disabled.feedbackSettings?.status.state, 'disabled');
  assert.equal(disabled.feedbackSettings?.command, null);
  assert.equal(disabled.feedbackSettings?.conversationId, 'manager-chat');
  assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1);
  assert.equal((await operations.dispatch({
    id: randomUUID(),
    operation: 'feedback settings',
    sessionId: 'stopped',
  })).ok, false);
});
