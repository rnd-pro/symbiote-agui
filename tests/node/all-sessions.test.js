import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { cachePath, prepareCachedMarkup, readCachedMarkup } from '../../src/sessions/cache.js';
import { startSession } from '../../src/sessions/start.js';
import { stopSession, statusSession } from '../../src/sessions/lifecycle.js';
import { readSession, reserveSession } from '../../src/sessions/store.js';
import { listSessionIds } from '../../src/sessions/list.js';
import { sessionKey } from '../../src/sessions/identity.js';
import { runAllSessions } from '../../src/sessions/all.js';
import { temporaryState } from './state-fixture.js';

let execute = promisify(execFile);
let cliPath = fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url));

/** @param {import('../../types/cli.js').AllSessionsCommand} command */
async function cli(command) {
  let { stdout } = await execute(process.execPath, [cliPath, command], { timeout: 45_000 });
  return /** @type {import('../../types/session.js').AllSessionsResult} */ (JSON.parse(stdout));
}

/** @param {string} sessionId */
async function save(sessionId) {
  let cache = await prepareCachedMarkup(sessionId, `<p>${sessionId}</p>`);
  await cache.commit();
}

test('all-session enumeration preserves case and ignores unrelated and temporary entries', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await reserveSession('Desk');
  await save('desk');
  await save('saved-only');
  await mkdir(join(state.directory, '.pending-unused'));
  await mkdir(join(state.directory, 'not-a-session'));
  await mkdir(join(state.directory, 'ff'));
  await writeFile(join(state.directory, '.cache', 'unrelated.html'), 'keep');
  await writeFile(`${cachePath('temporary')}.pending.tmp`, 'keep');
  assert.deepEqual(await listSessionIds(false), ['Desk']);
  assert.deepEqual(await listSessionIds(true), ['Desk', 'desk', 'saved-only']);
});

test('stop-all retains caches; clear-all includes stopped caches and keeps live workers available', async (t) => {
  let state = await temporaryState();
  t.after(async () => {
    await Promise.all(['Desk', 'desk'].map((id) => stopSession(id)));
    await state.close();
  });
  assert.deepEqual(await cli('stop-all'), { ok: true, command: 'stop-all', total: 0, sessions: [] });
  assert.deepEqual(await cli('clear-all'), { ok: true, command: 'clear-all', total: 0, sessions: [] });
  await Promise.all(['Desk', 'desk', 'saved-only'].map(save));
  await Promise.all(['Desk', 'desk'].map((id) => startSession(id)));
  let stopped = await cli('stop-all');
  assert.equal(stopped.ok, true);
  assert.deepEqual(stopped.sessions.map((session) => session.sessionId), ['Desk', 'desk']);
  for (let id of ['Desk', 'desk']) {
    assert.equal((await statusSession(id)).state, 'stopped');
    assert.equal(await readSession(id), undefined);
    assert.equal(await readCachedMarkup(id), `<p>${id}</p>`);
  }
  assert.equal((await cli('stop-all')).total, 0);
  await Promise.all(['Desk', 'desk'].map((id) => startSession(id)));
  let identities = await Promise.all(['Desk', 'desk'].map(readSession));
  let cleared = await cli('clear-all');
  assert.equal(cleared.ok, true);
  assert.equal(cleared.total, 3);
  assert.deepEqual(cleared.sessions.map((session) => session.sessionId), ['Desk', 'desk', 'saved-only']);
  for (let id of ['Desk', 'desk', 'saved-only']) {
    assert.equal(await readCachedMarkup(id), undefined);
  }
  for (let [index, id] of ['Desk', 'desk'].entries()) {
    assert.equal((await statusSession(id)).state, 'waiting');
    assert.equal((await readSession(id))?.instanceId, identities[index]?.instanceId);
  }
  assert.equal((await cli('clear-all')).ok, true);
});

test('bulk failures retain protected sessions, continue other sessions, and return a nonzero CLI exit', async (t) => {
  let state = await temporaryState();
  t.after(async () => {
    await stopSession('healthy');
    await state.close();
  });
  let blocked = await reserveSession('blocked');
  await save('blocked');
  await save('saved-only');
  await mkdir(join(state.directory, sessionKey('broken')));
  await startSession('healthy');
  let stopped = await runAllSessions('stop-all');
  assert.equal(stopped.ok, false);
  assert.deepEqual(stopped.sessions.map((session) => session.ok), [false, false, true]);
  assert.equal((await statusSession('healthy')).state, 'stopped');
  await assert.rejects(cli('clear-all'), (error) => {
    let failure = /** @type {Error & { code: number; stdout: string }} */ (error);
    let result = /** @type {import('../../types/session.js').AllSessionsResult} */ (JSON.parse(failure.stdout));
    assert.equal(failure.code, 1);
    assert.equal(result.ok, false);
    assert.equal(result.total, 3);
    assert.deepEqual(result.sessions.map((session) => session.ok), [false, false, true]);
    assert.equal(result.ok ? undefined : result.error.code, 'CLEAR_FAILED');
    return true;
  });
  assert.equal((await readSession('blocked'))?.instanceId, blocked.instanceId);
  assert.equal(await readCachedMarkup('blocked'), '<p>blocked</p>');
  assert.equal(await readCachedMarkup('saved-only'), undefined);
});

test('bulk commands stay inside the selected state directory', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await save('outside');
  let outside = cachePath('outside');
  process.env.AGUI_STATE_DIR = join(state.directory, 'isolated');
  assert.equal((await cli('clear-all')).total, 0);
  await save('inside');
  assert.equal((await cli('clear-all')).total, 1);
  assert.equal(await readCachedMarkup('inside'), undefined);
  assert.equal((await cli('stop-all')).total, 0);
  assert.equal(await readFile(outside, 'utf8'), '<p>outside</p>');
});
