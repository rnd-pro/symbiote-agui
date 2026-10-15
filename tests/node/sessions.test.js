import assert from 'node:assert/strict';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { stopSession } from '../../src/sessions/lifecycle.js';
import { startSession } from '../../src/sessions/start.js';
import { readSession, recordDirectory, releaseSession, reserveSession, writeSession } from '../../src/sessions/store.js';
import { temporaryState } from './state-fixture.js';

test('concurrent reservations publish one complete session', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let attempts = await Promise.allSettled(Array.from({ length: 8 }, () => reserveSession('demo')));
  assert.equal(attempts.filter(({ status }) => status === 'fulfilled').length, 1);
  let record = await readSession('demo');
  assert.ok(record);
  assert.equal(record.pid, process.pid);
  assert.match(record.controlToken, /^[a-f0-9]{64}$/);
  if (process.platform !== 'win32') {
    assert.equal((await stat(join(recordDirectory(record), 'session.json'))).mode & 0o777, 0o600);
  }
});

test('case-sensitive IDs stay distinct on case-insensitive filesystems', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let upper = await reserveSession('Demo');
  let lower = await reserveSession('demo');
  assert.notEqual(recordDirectory(upper), recordDirectory(lower));
  await releaseSession(upper);
  assert.equal((await readSession('demo'))?.instanceId, lower.instanceId);
});

test('repeated old cleanup preserves a replacement session', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let old = await reserveSession('demo');
  await releaseSession(old);
  let replacement = await reserveSession('demo');
  await releaseSession(old);
  assert.equal((await readSession('demo'))?.instanceId, replacement.instanceId);
});

test('an unverified live process prevents session takeover', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('demo');
  await assert.rejects(startSession('demo'), { code: 'SESSION_EXISTS' });
  assert.equal((await readSession('demo'))?.instanceId, record.instanceId);
});

test('startup failure releases resources and permits reusing the ID', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let previousOptions = process.env.NODE_OPTIONS;
  t.after(() => {
    if (previousOptions === undefined) { delete process.env.NODE_OPTIONS; }
    else { process.env.NODE_OPTIONS = previousOptions; }
  });
  process.env.NODE_OPTIONS = '--agui-invalid-worker-option';
  for (let attempt of [1, 2]) {
    await assert.rejects(startSession('failure'), { code: 'START_FAILED' });
    assert.equal(await readSession('failure'), undefined);
    assert.deepEqual(await readdir(state.directory), []);
  }
});

test('a dead reservation is reclaimed and stop is idempotent', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('stale');
  record.pid = 2_147_483_647;
  await writeSession(record);
  let started = await startSession('stale');
  assert.equal(started.state, 'waiting');
  assert.deepEqual(await stopSession('stale'), { sessionId: 'stale', state: 'stopped' });
  assert.deepEqual(await stopSession('stale'), { sessionId: 'stale', state: 'stopped' });
});
