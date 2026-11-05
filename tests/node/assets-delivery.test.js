import assert from 'node:assert/strict';
import { request } from 'node:http';
import { appendFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { assetHttpFixture } from './assets-http-fixture.js';
import { waitForAbort } from './proxy-http-fixture.js';
import { openAssetFile } from '../../src/assets/files.js';
import { withAssetLock } from '../../src/assets/lock.js';
import { withSessionLock } from '../../src/sessions/storage-lock.js';

test('one local-asset deadline covers file admission and frees concurrency after timeout', async (t) => {
  let started = Promise.withResolvers();
  let fixture = await assetHttpFixture(t, {
    limits: {
      timeoutMs: 100,
      concurrentRequests: 1,
    },
    open: async (_path, signal) => {
      started.resolve(undefined);
      return waitForAbort(signal);
    },
  });
  let waiting = fetch(fixture.url());
  await started.promise;
  let busy = await fetch(fixture.url());
  assert.equal(busy.status, 429);
  assert.equal(busy.headers.get('retry-after'), '1');
  assert.equal((await busy.json()).error.code, 'ASSET_BUSY');
  let timedOut = await waiting;
  assert.equal(timedOut.status, 504);
  assert.equal((await timedOut.json()).error.code, 'ASSET_TIMEOUT');
  await Promise.all(Array.from(fixture.assets.tasks));
  assert.equal(fixture.assets.active.size, 0);
  fixture.assets.open = openAssetFile;
  assert.equal((await fetch(fixture.url())).status, 200);
});

test('disconnect and shutdown cancel admitted local reads without retaining tasks or replaying them', async (t) => {
  let started = Promise.withResolvers();
  let cancelled = Promise.withResolvers();
  let reads = 0;
  let fixture = await assetHttpFixture(t, {
    open: async (_path, signal) => {
      reads++;
      started.resolve(undefined);
      try { return await waitForAbort(signal); }
      finally { cancelled.resolve(undefined); }
    },
  });
  let outgoing = request(fixture.url());
  outgoing.on('error', () => {});
  outgoing.end();
  await started.promise;
  outgoing.destroy();
  await cancelled.promise;
  await Promise.all(Array.from(fixture.assets.tasks));
  assert.equal(fixture.assets.active.size, 0);
  assert.equal(reads, 1);
  started = Promise.withResolvers();
  let pending = fetch(fixture.url());
  await started.promise;
  await fixture.assets.close();
  let stopped = await pending;
  assert.equal(stopped.status, 503);
  assert.equal((await stopped.json()).error.code, 'ASSET_STOPPED');
  assert.equal(fixture.assets.active.size, 0);
  assert.equal(fixture.assets.tasks.size, 0);
  assert.equal(fixture.assets.status().available, false);
  assert.equal((await fetch(fixture.url())).status, 503);
  assert.equal(reads, 2);
});

test('a timed-out first file read returns a bounded error and closes its already opened handle', async (t) => {
  let closed = 0;
  let fixture = await assetHttpFixture(t, {
    limits: {
      timeoutMs: 50,
    },
    open: async (path, signal) => {
      let file = await openAssetFile(path, signal);
      let close = file.handle.close.bind(file.handle);
      Reflect.set(file.handle, 'close', async () => { closed++; await close(); });
      Reflect.set(file.handle, 'read', () => waitForAbort(signal));
      return file;
    },
  });
  let result = await fetch(fixture.url());
  assert.equal(result.status, 504);
  assert.equal((await result.json()).error.code, 'ASSET_TIMEOUT');
  await Promise.all(Array.from(fixture.assets.tasks));
  assert.equal(closed, 1);
  assert.equal(fixture.assets.active.size, 0);
});

test('files growing during delivery cannot complete the advertised body and handles are closed', async (t) => {
  let closed = 0;
  let changed = false;
  let fixture = await assetHttpFixture(t, {
    open: async (path, signal) => {
      let file = await openAssetFile(path, signal);
      let read = file.handle.read.bind(file.handle);
      let close = file.handle.close.bind(file.handle);
      Reflect.set(file.handle, 'close', async () => { closed++; await close(); });
      /**
       * @param {Buffer} buffer
       * @param {number} offset
       * @param {number} length
       * @param {number} position
       */
      let mutateDuringRead = async (buffer, offset, length, position) => {
        let result = await read(buffer, offset, length, position);
        if (!changed) {
          changed = true;
          await appendFile(path, 'changed');
        }
        return result;
      };
      Reflect.set(file.handle, 'read', mutateDuringRead);
      return file;
    },
  });
  await writeFile(join(fixture.directory, 'growing.txt'), Buffer.alloc(256 * 1024, 65));
  await assert.rejects(async () => {
    let result = await fetch(fixture.url('growing.txt'));
    await result.arrayBuffer();
  });
  await Promise.all(Array.from(fixture.assets.tasks));
  assert.equal(changed, true);
  assert.equal(closed, 1);
  assert.equal(fixture.assets.active.size, 0);
});

test('replacing a file between open and verification never returns unchecked bytes', async (t) => {
  let fixture = await assetHttpFixture(t, {
    open: async (path, signal) => {
      let file = await openAssetFile(path, signal);
      await writeFile(path, 'changed after open');
      return file;
    },
  });
  let response = await fetch(fixture.url());
  assert.equal(response.status, 403);
  let result = await response.json();
  assert.equal(result.error.code, 'ASSET_ACCESS_DENIED');
  assert.doesNotMatch(JSON.stringify(result), /changed after open|\.cache|logo\.svg/);
});

test('asset preparation waits for publication without deadlocking the session render lock', async (t) => {
  let fixture = await assetHttpFixture(t);
  let entered = Promise.withResolvers();
  let release = Promise.withResolvers();
  let temporary = join(fixture.directory, '.agui-staged.tmp');
  let publishing = withAssetLock('desk', async () => {
    await writeFile(temporary, 'not a published asset');
    entered.resolve(undefined);
    await release.promise;
    await unlink(temporary);
  });
  await entered.promise;
  let pending = fetch(fixture.url());
  release.resolve(undefined);
  await publishing;
  assert.equal((await pending).status, 200);
  let result = await withSessionLock('desk', () => fetch(fixture.url()));
  assert.equal(result.status, 200);
  assert.equal(await result.text(), fixture.bytes.toString());
});

test('asset lock waiting is cancelled by the request deadline without waiting for the publisher', async (t) => {
  let fixture = await assetHttpFixture(t, {
    limits: {
      timeoutMs: 50,
    },
  });
  await withAssetLock('desk', async () => {
    let response = await fetch(fixture.url());
    assert.equal(response.status, 504);
    assert.equal((await response.json()).error.code, 'ASSET_TIMEOUT');
  });
  await Promise.all(Array.from(fixture.assets.tasks));
  assert.equal(fixture.assets.active.size, 0);
});
