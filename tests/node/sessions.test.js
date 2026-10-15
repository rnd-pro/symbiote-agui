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
  let attempts = await Promise.allSettled(Array.from({ length: 8 }, () => reserveSession('demo', { mode: 'managed', channel: 'chrome' })));
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
  let upper = await reserveSession('Demo', { mode: 'managed', channel: 'chrome' });
  let lower = await reserveSession('demo', { mode: 'managed', channel: 'chrome' });
  assert.notEqual(recordDirectory(upper), recordDirectory(lower));
  await releaseSession(upper);
  assert.equal((await readSession('demo'))?.instanceId, lower.instanceId);
});

test('repeated old cleanup preserves a replacement session', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let old = await reserveSession('demo', { mode: 'managed', channel: 'chrome' });
  await releaseSession(old);
  let replacement = await reserveSession('demo', { mode: 'managed', channel: 'chrome' });
  await releaseSession(old);
  assert.equal((await readSession('demo'))?.instanceId, replacement.instanceId);
});

test('an unverified live process prevents session takeover', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('demo', { mode: 'managed', channel: 'chrome' });
  await assert.rejects(startSession('demo', record.browser), { code: 'SESSION_EXISTS' });
  assert.equal((await readSession('demo'))?.instanceId, record.instanceId);
});

test('startup failure releases resources and permits reusing the ID', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  for (let attempt of [1, 2]) {
    await assert.rejects(startSession('failure', { mode: 'managed', executablePath: join(state.directory, `missing-chrome-${attempt}`) }), { code: 'START_FAILED', message: /missing-chrome/ });
    assert.equal(await readSession('failure'), undefined);
    assert.deepEqual(await readdir(state.directory), []);
  }
});

test('a dead reservation is reclaimed and stop is idempotent', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let record = await reserveSession('stale', { mode: 'managed', channel: 'chrome' });
  record.pid = 2_147_483_647;
  await writeSession(record);
  await assert.rejects(startSession('stale', { mode: 'managed', executablePath: join(state.directory, 'missing-chrome') }), { code: 'START_FAILED' });
  assert.deepEqual(await stopSession('stale'), { sessionId: 'stale', state: 'stopped' });
  assert.deepEqual(await stopSession('stale'), { sessionId: 'stale', state: 'stopped' });
});
