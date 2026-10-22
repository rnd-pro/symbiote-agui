import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionFeedback } from '../../src/feedback/session-feedback.js';
import { executeFeedback } from '../../src/feedback/execute.js';
import { FEEDBACK_LIMITS } from '../../src/feedback/constants.js';

let fixture = fileURLToPath(new URL('./feedback-fixture.js', import.meta.url));

/**
 * @param {string} [mode]
 * @param {string[]} [args]
 */
function registration(mode = 'accept', args = []) {
  return {
    sessionId: 'feedback-test', instanceId: randomUUID(), conversationId: randomUUID(),
    command: { executable: process.execPath, args: [fixture, mode, ...args], input: /** @type {const} */ ({ channel: 'stdin' }) },
  };
}

/** @param {string} instanceId */
function submission(instanceId) {
  return { submissionId: randomUUID(), instanceId, revision: 'revision-1',
    event: { type: 'changes.submitted', source: 'editor', data: { name: 'Example' } } };
}

test('registration validates identity and command without leaking or sharing private state', async (t) => {
  let config = registration();
  let feedback = new SessionFeedback(config);
  t.after(() => feedback.close());
  for (let input of [null, { ...config, instanceId: randomUUID() },
    { ...config, extra: 'secret' }, { ...config, command: { ...config.command, executable: 'node' } },
    { ...config, command: { ...config.command, input: { channel: 'argument', index: 999 } } },
    { ...config, command: { ...config.command, args: ['bad\0arg'] } },
    { ...config, command: { ...config.command, cwd: '/nonexistent-feedback-working-directory' } }]) {
    await assert.rejects(feedback.configure(input), { code: 'INVALID_INPUT' });
    assert.equal(feedback.status().state, 'disabled');
  }
  await feedback.configure(config);
  config.command.args.push('private-change');
  let encoded = JSON.stringify(feedback.status());
  for (let privateValue of [fixture, config.conversationId, 'private-change', 'executable', 'command']) {
    assert.ok(!encoded.includes(privateValue));
  }
  let result = once(feedback, 'delivery');
  feedback.submit(submission(config.instanceId));
  assert.equal((await result)[0].state, 'accepted');
});

test('submissions are ordered and duplicates or stale instances cannot execute again', async (t) => {
  let directory = await mkdtemp(join(tmpdir(), 'agui-feedback-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let log = join(directory, 'deliveries.jsonl');
  let config = registration('record', [log]);
  let feedback = new SessionFeedback(config);
  t.after(() => feedback.close());
  await feedback.configure(config);
  let first = submission(config.instanceId);
  let second = submission(config.instanceId);
  /** @type {import('../../types/feedback.js').FeedbackDelivery[]} */
  let deliveries = [];
  let completed = new Promise((resolve) => feedback.on('delivery', (result) => {
    deliveries.push(result);
    if (deliveries.length === 2) { resolve(undefined); }
  }));
  assert.equal(feedback.submit({ ...first, instanceId: randomUUID() }).failure?.code, 'STALE_INSTANCE');
  assert.equal(feedback.submit(first).state, 'queued');
  assert.equal(feedback.submit(first).state, 'queued');
  assert.equal(feedback.submit({ ...first, revision: 'different' }).failure?.code, 'INVALID_SUBMISSION');
  feedback.submit(second);
  await completed;
  assert.deepEqual(deliveries.map((item) => item.submissionId), [first.submissionId, second.submissionId]);
  assert.equal(feedback.submit(first).state, 'accepted');
  let records = (await readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(records.length, 2);
  assert.equal(records[0].conversationId, config.conversationId);
  assert.equal(records[0].sessionId, config.sessionId);
  assert.equal(records[0].revision, 'revision-1');
  assert.throws(() => feedback.submit({ ...first, conversationId: 'injected' }), { code: 'INVALID_INPUT' });
  assert.throws(() => feedback.submit({ ...first, event: { ...first.event, data: 'x'.repeat(FEEDBACK_LIMITS.bytes) } }), { code: 'INVALID_INPUT' });
  assert.throws(() => feedback.submit({ ...first, event: { ...first.event, data: NaN } }), { code: 'INVALID_INPUT' });
});

test('payloads remain data through stdin and through a single structured argument', async () => {
  for (let channel of ['stdin', 'argument']) {
    let config = registration(channel === 'argument' ? 'argument' : 'accept');
    /** @type {import('../../types/feedback.js').FeedbackCommand} */
    let command = { ...config.command, input: channel === 'argument' ? { channel, index: 2 } : { channel: 'stdin' } };
    let input = submission(config.instanceId);
    let maliciousText = '`exit 91` $(exit 92); "\n spaces & |';
    input.event.data.name = maliciousText;
    let result = await executeFeedback(command, { ...input, sessionId: config.sessionId, conversationId: config.conversationId }, new AbortController().signal);
    assert.equal(result.state, 'accepted');
    assert.equal(result.receiptId, input.submissionId);
  }
});

test('timeouts, output limits, and missing acknowledgements stay unknown and redact output', async () => {
  for (let mode of ['hold', 'overflow', 'malformed', 'fail']) {
    let config = registration(mode);
    let result = await executeFeedback(config.command,
      { ...submission(config.instanceId), sessionId: config.sessionId, conversationId: config.conversationId },
      new AbortController().signal, mode === 'hold' ? 100 : undefined);
    assert.equal(result.state, 'unknown');
    assert.equal(result.failure?.code, 'DELIVERY_UNKNOWN');
    assert.ok(!JSON.stringify(result).includes('private-'));
  }
  let config = registration();
  config.command.executable = '/nonexistent-feedback-command';
  let result = await executeFeedback(config.command,
    { ...submission(config.instanceId), sessionId: config.sessionId, conversationId: config.conversationId }, new AbortController().signal);
  assert.equal(result.state, 'rejected');
  assert.equal(result.failure?.code, 'COMMAND_FAILED');
});

test('queue limits are explicit and disabling rejects pending work without rebinding', async (t) => {
  let config = registration('hold');
  let feedback = new SessionFeedback(config);
  t.after(() => feedback.close());
  await feedback.configure(config);
  /** @type {import('../../types/feedback.js').FeedbackDelivery[]} */
  let deliveries = [];
  feedback.on('delivery', (delivery) => deliveries.push(delivery));
  for (let index = 0; index < FEEDBACK_LIMITS.pending; index += 1) {
    assert.equal(feedback.submit(submission(config.instanceId)).state, 'queued');
  }
  assert.equal(feedback.submit(submission(config.instanceId)).failure?.code, 'QUEUE_FULL');
  await assert.rejects(feedback.disable({ sessionId: config.sessionId, instanceId: randomUUID() }));
  await feedback.disable(feedback.identity);
  assert.equal(deliveries.length, FEEDBACK_LIMITS.pending);
  assert.equal(deliveries.filter((delivery) => delivery.state === 'rejected').length, FEEDBACK_LIMITS.pending - 1);
  assert.equal(deliveries.filter((delivery) => delivery.state === 'unknown').length, 1);
  assert.equal(feedback.status().pending, 0);
  await assert.rejects(feedback.configure({ ...config, conversationId: randomUUID() }), { code: 'INVALID_INPUT' });
  await feedback.configure(config);
  await feedback.close();
  assert.equal(feedback.submit(submission(config.instanceId)).failure?.code, 'DISABLED');
  await assert.rejects(feedback.configure(config));
});

test('conversation unavailability disables later submissions without changing their route', async (t) => {
  let config = registration('unavailable');
  let feedback = new SessionFeedback(config);
  t.after(() => feedback.close());
  await feedback.configure(config);
  let completed = once(feedback, 'delivery');
  feedback.submit(submission(config.instanceId));
  assert.equal((await completed)[0].failure.code, 'UNAVAILABLE');
  assert.equal(feedback.status().state, 'unavailable');
  assert.equal(feedback.submit(submission(config.instanceId)).failure?.code, 'UNAVAILABLE');
});
