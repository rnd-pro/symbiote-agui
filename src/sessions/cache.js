import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { readUtf8Markup } from '../markup/read-input.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage, hasErrorCode } from '../shared/system-error.js';
import { getStateRoot } from './store.js';
import { sessionKey } from './identity.js';

/** @param {string} sessionId */
export function cachePath(sessionId) {
  return join(getStateRoot(), '.cache', `${sessionKey(sessionId)}.html`);
}

/**
 * @param {string} path
 * @param {unknown} error
 */
function cacheError(path, error) {
  return new CommandError(`Cannot access interface cache ${path}: ${errorMessage(error)}`, ERROR_CODE.CACHE_ERROR, EXIT_CODE.RUNTIME_ERROR);
}

/** @param {string} sessionId */
export async function readCachedMarkup(sessionId) {
  let path = cachePath(sessionId);
  let stream = createReadStream(path);
  try {
    return await readUtf8Markup(stream);
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { return undefined; }
    throw cacheError(path, error);
  } finally {
    stream.destroy();
  }
}

/** @param {string} path */
async function removeFile(path) {
  try { await unlink(path); }
  catch (error) {
    if (!hasErrorCode(error, 'ENOENT')) { throw cacheError(path, error); }
  }
}

/**
 * @param {string} sessionId
 * @param {string} html
 * @returns {Promise<import('../../types/session.js').PreparedCache>}
 */
export async function prepareCachedMarkup(sessionId, html) {
  let path = cachePath(sessionId);
  let temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(temporary, html, { encoding: 'utf8', flag: 'wx', mode: 0o600, flush: true });
  } catch (error) {
    await removeFile(temporary);
    throw cacheError(path, error);
  }
  return {
    async commit() {
      try { await rename(temporary, path); }
      catch (error) { throw cacheError(path, error); }
    },
    discard: () => removeFile(temporary),
  };
}

/** @param {string} sessionId */
export async function clearCachedMarkup(sessionId) {
  await removeFile(cachePath(sessionId));
}
