import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { readUtf8Markup } from '../markup/read-input.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage, hasErrorCode } from '../shared/system-error.js';

/**
 * @param {string} path
 * @param {unknown} error
 */
export function storageError(path, error) {
  return new CommandError(`Cannot access interface cache ${path}: ${errorMessage(error)}`, ERROR_CODE.CACHE_ERROR, EXIT_CODE.RUNTIME_ERROR);
}

/**
 * @param {string} path
 * @param {number} [maxBytes]
 */
export async function readOptional(path, maxBytes) {
  let stream = createReadStream(path);
  try { return await readUtf8Markup(stream, maxBytes); }
  catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { return undefined; }
    throw storageError(path, error);
  } finally { stream.destroy(); }
}

/** @param {string} path */
export async function removeFile(path) {
  try { await unlink(path); }
  catch (error) { if (!hasErrorCode(error, 'ENOENT')) { throw storageError(path, error); } }
}

/**
 * @param {string} path
 * @param {string} text
 * @param {{ text: string | undefined; maxBytes?: number }} [expected]
 * @returns {Promise<import('../../types/session.js').PreparedCache>}
 */
export async function prepareTextFile(path, text, expected) {
  let before = await readOptional(path, expected?.maxBytes);
  if (expected && expected.text !== before) {
    throw storageError(path, new Error('The file changed while preparing this save. Review the changes and retry.'));
  }
  let temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(temporary, text, { encoding: 'utf8', flag: 'wx', mode: 0o600, flush: true });
  } catch (error) {
    await removeFile(temporary);
    throw storageError(path, error);
  }
  return {
    async commit() {
      if (await readOptional(path, expected?.maxBytes) !== before) {
        throw storageError(path, new Error('The file changed while preparing this save. Review the changes and retry.'));
      }
      try { await rename(temporary, path); }
      catch (error) { throw storageError(path, error); }
    },
    discard: () => removeFile(temporary),
  };
}

/**
 * @param {string} path
 * @param {string} text
 * @param {string} [id]
 * @returns {Promise<import('../../types/session.js').PreparedCache>}
 */
export async function prepareNewTextFile(path, text, id = randomUUID()) {
  let temporary = `${path}.${id}.tmp`;
  await mkdir(dirname(path), {
    recursive: true,
    mode: 0o700,
  });
  try {
    await writeFile(temporary, text, {
      flag: 'wx',
      mode: 0o600,
      flush: true,
    });
  } catch (error) {
    if (!hasErrorCode(error, 'EEXIST')) { await removeFile(temporary).catch(() => {}); }
    throw error;
  }
  return {
    // A link publishes a complete file atomically and fails if the target exists.
    commit: () => link(temporary, path),
    discard: () => removeFile(temporary),
  };
}
