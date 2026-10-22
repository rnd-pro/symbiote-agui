import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { startControlServer } from '../../src/server/control-server.js';
import { closeServer } from '../../src/shared/server.js';
import { requestSession } from '../../src/sessions/client.js';
import { reserveSession, writeSession, readSession } from '../../src/sessions/store.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { runFeedbackCommand } from '../../src/cli/feedback.js';
import { parseCommand } from '../../src/cli/parse.js';
import { FEEDBACK_LIMITS } from '../../src/feedback/constants.js';
import { temporaryState } from './state-fixture.js';

test('feedback commands reject unknown operations, extra arguments, and unrelated options', () => {
  assert.deepEqual(parseCommand(['feedback', 'configure', 'desk', '--file', 'private.json']), {
    kind: 'feedback', command: 'configure', sessionId: 'desk', file: 'private.json',
  });
  assert.deepEqual(parseCommand(['feedback', 'status', 'desk']), { kind: 'feedback', command: 'status', sessionId: 'desk' });
  for (let args of [[], ['enable', 'desk'], ['status'], ['status', '../desk'], ['status', 'desk', 'other'],
    ['status', 'desk', '--file', 'private.json'], ['disable', 'desk', '--no-open'], ['configure', 'desk', '--file', '']]) {
    assert.throws(() => parseCommand(['feedback', ...args]), { code: 'INVALID_INPUT' });
  }
});

test('private feedback control keeps worker identity, redacts configuration, and closes independently of UI updates', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('feedback-control');
  record.pid = process.pid;
  let runtime = new SessionRuntime(record);
  let control = await startControlServer(record, () => runtime.status(), () => runtime.close(), {
    feedbackConfigure: (input) => runtime.configureFeedback(input),
    feedbackStatus: () => runtime.feedbackStatus(),
    feedbackDisable: (input) => runtime.disableFeedback(input),
  });
  t.after(async () => { await runtime.close(); await closeServer(control.server); });
  record.controlUrl = control.url;
  await writeSession(record);
  for (let path of ['feedback', 'feedback/configure', 'feedback/disable']) {
    let response = await fetch(`${control.url}/${path}`, { method: path === 'feedback' ? 'GET' : 'POST', body: path === 'feedback' ? undefined : '{}' });
    assert.equal(response.status, 401);
  }
  let before = await runFeedbackCommand({ kind: 'feedback', command: 'status', sessionId: record.sessionId });
  assert.equal(before.feedback?.state, 'disabled');
  let config = { sessionId: record.sessionId, instanceId: record.instanceId, conversationId: randomUUID(),
    command: { executable: process.execPath,
      args: [fileURLToPath(new URL('./feedback-fixture.js', import.meta.url)), 'hold'], input: { channel: 'stdin' } } };
  await assert.rejects(requestSession(record, 'feedback/configure', 2_000, JSON.stringify({ ...config, instanceId: randomUUID() })), { code: 'INVALID_INPUT' });
  await assert.rejects(requestSession(record, 'feedback/configure', 2_000, 'bad private json'), { code: 'INVALID_INPUT' });
  await assert.rejects(requestSession(record, 'feedback/configure', 2_000, 'x'.repeat(FEEDBACK_LIMITS.bytes + 1)), { code: 'INPUT_TOO_LARGE' });
  let file = join(state.directory, 'private-feedback.json');
  await writeFile(file, JSON.stringify(config));
  let configured = await runFeedbackCommand({ kind: 'feedback', command: 'configure', sessionId: record.sessionId, file });
  assert.equal(configured.feedback?.state, 'ready');
  assert.ok(!JSON.stringify(configured).includes(config.conversationId));
  let stored = await readSession(record.sessionId);
  assert.equal(Object.hasOwn(stored || {}, 'feedback'), false);
  assert.ok(!JSON.stringify(stored).includes(config.conversationId));
  await assert.rejects(requestSession({ ...record, instanceId: randomUUID() }, 'feedback'), { code: 'SESSION_UNREACHABLE' });
  let delivery = once(runtime.feedback, 'delivery');
  runtime.feedback.submit({ submissionId: randomUUID(), instanceId: record.instanceId,
    event: { type: 'save', source: 'editor', data: { name: 'Example' } } });
  assert.equal(await runtime.enqueue(async () => 'ui-update-completed'), 'ui-update-completed');
  assert.equal((await runFeedbackCommand({ kind: 'feedback', command: 'disable', sessionId: record.sessionId })).feedback?.state, 'disabled');
  assert.equal((await delivery)[0].state, 'unknown');
  await runtime.configureFeedback(config);
  await runtime.close();
  assert.equal(runtime.feedbackStatus().feedback.state, 'disabled');
  let replacement = new SessionRuntime({ ...record, instanceId: randomUUID() });
  assert.equal(replacement.feedbackStatus().feedback.state, 'disabled');
  await replacement.close();
});

test('older workers report unsupported feedback and CLI does not start a stopped session', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await assert.rejects(runFeedbackCommand({ kind: 'feedback', command: 'status', sessionId: 'stopped' }), { code: 'SESSION_STOPPED' });
  assert.equal(await readSession('stopped'), undefined);
  let record = await reserveSession('old-worker');
  record.pid = process.pid;
  let control = await startControlServer(record, () => ({ sessionId: record.sessionId, state: 'waiting' }), async () => {});
  t.after(() => closeServer(control.server));
  record.controlUrl = control.url;
  await assert.rejects(requestSession(record, 'feedback'), { code: 'NOT_IMPLEMENTED' });
});

test('clear cancels registration in progress and disables an existing handler without rebinding', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('feedback-clear');
  let runtime = new SessionRuntime(record);
  t.after(() => runtime.close());
  await runtime.start(new AbortController().signal);
  let config = { sessionId: record.sessionId, instanceId: record.instanceId, conversationId: randomUUID(),
    command: { executable: process.execPath, args: [], input: { channel: 'stdin' } } };
  let configuring = runtime.configureFeedback(config);
  let clearing = runtime.clear();
  await assert.rejects(configuring, { code: 'INVALID_INPUT' });
  await clearing;
  assert.equal(runtime.feedbackStatus().feedback.state, 'disabled');
  await runtime.configureFeedback(config);
  await runtime.clear();
  assert.equal(runtime.feedbackStatus().feedback.state, 'disabled');
  await assert.rejects(runtime.configureFeedback({ ...config, conversationId: randomUUID() }), { code: 'INVALID_INPUT' });
});
