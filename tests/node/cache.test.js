import assert from 'node:assert/strict';
import { readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { cachePath, clearCachedMarkup, prepareCachedMarkup, readCachedMarkup } from '../../src/sessions/cache.js';
import { clearSession } from '../../src/sessions/clear.js';
import { startSession } from '../../src/sessions/start.js';
import { stopSession } from '../../src/sessions/lifecycle.js';
import { readSession, reserveSession } from '../../src/sessions/store.js';
import { requestSession } from '../../src/sessions/client.js';
import { MAX_HTML_BYTES } from '../../src/markup/constants.js';
import { temporaryState } from './state-fixture.js';

/**
 * @param {string} id
 * @param {string} html
 */
async function save(id, html) {
  let cache = await prepareCachedMarkup(id, html);
  try { await cache.commit(); }
  finally { await cache.discard(); }
}

test('cache publication is atomic, private, and preserves inline modules and empty definitions', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  assert.equal(await readCachedMarkup('desk'), undefined);
  let html = '<p>Saved café</p><script type="module" data-agui>export default () => {};</script>';
  await save('desk', html);
  let pending = await prepareCachedMarkup('desk', '<p>Replacement</p>');
  assert.equal(await readCachedMarkup('desk'), html);
  await pending.discard();
  assert.equal(await readCachedMarkup('desk'), html);
  if (process.platform !== 'win32') {
    assert.equal((await stat(cachePath('desk'))).mode & 0o777, 0o600);
    assert.equal((await stat(dirname(cachePath('desk')))).mode & 0o777, 0o700);
  }
  await save('desk', '');
  assert.equal(await readCachedMarkup('desk'), '');
  assert.equal((await readdir(dirname(cachePath('desk')))).length, 1);
  await clearCachedMarkup('desk');
  await clearCachedMarkup('desk');
  assert.equal(await readCachedMarkup('desk'), undefined);
});

test('failed cache publication leaves the previous accepted definition intact', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await save('desk', '<p>Accepted</p>');
  let pending = await prepareCachedMarkup('desk', '<p>Rejected</p>');
  let directory = dirname(cachePath('desk'));
  let temporary = (await readdir(directory)).find((file) => file.endsWith('.tmp'));
  assert.ok(temporary);
  await unlink(join(directory, temporary));
  await assert.rejects(pending.commit(), { code: 'CACHE_ERROR' });
  await pending.discard();
  assert.equal(await readCachedMarkup('desk'), '<p>Accepted</p>');
});

test('cache keeps case-sensitive IDs and state-directory isolation', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await save('Desk', 'upper');
  await save('desk', 'lower');
  assert.notEqual(cachePath('Desk'), cachePath('desk'));
  let isolated = await temporaryState();
  try {
    assert.equal(await readCachedMarkup('desk'), undefined);
    await save('desk', 'isolated');
    await clearSession('desk');
    assert.equal(await readCachedMarkup('desk'), undefined);
  } finally {
    await isolated.close();
  }
  assert.equal(await readCachedMarkup('Desk'), 'upper');
  assert.equal(await readCachedMarkup('desk'), 'lower');
  await clearSession('Desk');
  assert.equal(await readCachedMarkup('desk'), 'lower');
});

test('unreadable cache data fails explicitly and clear does not bypass a live reservation', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await save('desk', 'accepted');
  await writeFile(cachePath('desk'), Buffer.from([0xff]));
  await assert.rejects(readCachedMarkup('desk'), { code: 'CACHE_ERROR' });
  await assert.rejects(startSession('desk'), /Cannot access interface cache/);
  assert.equal(await readSession('desk'), undefined);
  assert.equal((await stat(cachePath('desk'))).size, 1);
  await writeFile(cachePath('desk'), Buffer.alloc(MAX_HTML_BYTES + 1));
  await assert.rejects(readCachedMarkup('desk'), { code: 'CACHE_ERROR' });
  await clearSession('desk');
  await save('reserved', 'accepted');
  await reserveSession('reserved');
  await assert.rejects(clearSession('reserved'), { code: 'SESSION_UNREACHABLE' });
  assert.equal(await readCachedMarkup('reserved'), 'accepted');
});

test('worker restart restores cache, failed insertions preserve it, and clear works running or stopped', async (t) => {
  let state = await temporaryState();
  t.after(async () => { await stopSession('saved').catch(() => {}); await state.close(); });
  assert.equal((await startSession('saved')).restored, false);
  let record = await readSession('saved');
  assert.ok(record);
  let html = '<p class="w-[321px]">Remembered</p>';
  await requestSession(record, 'insert', 5_000, html);
  await assert.rejects(requestSession(record, 'insert', 5_000, '<agui-component><script type="text/json">{broken}</script></agui-component>'), { code: 'INSERT_FAILED' });
  assert.equal(await readCachedMarkup('saved'), html);
  await stopSession('saved');
  assert.equal(await readSession('saved'), undefined);
  assert.equal(await readCachedMarkup('saved'), html);
  let restarted = await startSession('saved');
  assert.equal(restarted.restored, true);
  assert.match(await (await fetch(new URL('/styles.css.js', restarted.url))).text(), /321px/);
  assert.equal((await clearSession('saved')).cleared, true);
  assert.equal(await readCachedMarkup('saved'), undefined);
  record = await readSession('saved');
  assert.ok(record);
  await requestSession(record, 'insert', 5_000, '');
  await stopSession('saved');
  assert.equal((await startSession('saved')).restored, true);
  await stopSession('saved');
  assert.deepEqual(await clearSession('saved'), { sessionId: 'saved', state: 'stopped', cleared: true });
  assert.equal((await startSession('saved')).restored, false);
});
