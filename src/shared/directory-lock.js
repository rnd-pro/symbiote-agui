import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rename, rm, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { isProcessAlive } from '../sessions/store.js';
import { hasErrorCode } from '../shared/system-error.js';
import { storageError } from '../library/files.js';

/**
 * @param {string} lock
 * @param {string} owner
 */
async function release(lock, owner) {
  try { await rmdir(join(lock, owner)); }
  catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { return; }
    throw error;
  }
  await rmdir(lock).catch((error) => {
    if (![
      'ENOENT',
      'ENOTEMPTY',
      'EEXIST',
    ].some((code) => hasErrorCode(error, code))) { throw error; }
  });
}

/**
 * @template T
 * @param {string} root
 * @param {() => Promise<T>} task
 * @param {string} [name]
 */
export async function withDirectoryLock(root, task, name = 'storage') {
  await mkdir(root, {
    recursive: true,
    mode: 0o700,
  });
  let temporary = await mkdtemp(join(root, `.${name}-pending-`));
  let lock = join(root, `.${name}-lock`);
  let owner = `${process.pid}-${randomUUID()}`;
  let acquired = false;
  try {
    await mkdir(join(temporary, owner));
    let deadline = Date.now() + 30000;
    while (!acquired) {
      try { await rename(temporary, lock); acquired = true; }
      catch (error) {
        if (![
          'EEXIST',
          'ENOTEMPTY',
          'EPERM',
        ].some((code) => hasErrorCode(error, code))) { throw error; }
        let entries = await readdir(lock).catch((error) => {
          if (hasErrorCode(error, 'ENOENT')) { return []; }
          throw error;
        });
        let previous = entries[0];
        let match = previous?.match(/^([1-9][0-9]*)-[a-f0-9-]{36}$/);
        if (entries.length === 1 && match && !isProcessAlive(Number(match[1]))) { await release(lock, previous); }
        if (Date.now() >= deadline) { throw storageError(lock, new Error('Storage is busy. Retry after the current operation finishes.')); }
        await delay(20);
      }
    }
    return await task();
  } finally {
    if (acquired) { await release(lock, owner); }
    else { await rm(temporary, {
      recursive: true,
      force: true,
    }); }
  }
}
