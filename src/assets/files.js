import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, rmdir } from 'node:fs/promises';
import { dirname, join, parse, resolve, sep } from 'node:path';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';
import { ASSET_LIMITS } from './constants.js';
import { assetPath } from './paths.js';

/**
 * @param {string} path
 * @param {import('../../types/assets.js').AssetRoot} [expected]
 */
async function directory(path, expected) {
  let info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink() || await realpath(path) !== path
    || expected && (info.dev !== expected.dev || info.ino !== expected.ino)) {
    throw new CommandError('The asset directory changed or contains a symbolic link. Restore the original directory before retrying.');
  }
  return info;
}

/** @param {string} path */
async function directoryChain(path) {
  let root = parse(path).root;
  let current = root;
  for (let segment of path.slice(root.length).split(sep).filter(Boolean)) {
    current = join(current, segment);
    await directory(current);
  }
}

/**
 * @param {string} path
 * @param {boolean} [create]
 * @returns {Promise<import('../../types/assets.js').AssetRoot | undefined>}
 */
export async function assetRoot(path, create = false) {
  await directoryChain(dirname(path));
  if (create) {
    try { await mkdir(path, {
      mode: 0o700,
    }); }
    catch (error) { if (!hasErrorCode(error, 'EEXIST')) { throw error; } }
  }
  let info;
  try { info = await directory(path); }
  catch (error) { if (hasErrorCode(error, 'ENOENT') && !create) { return; } throw error; }
  return {
    path,
    dev: info.dev,
    ino: info.ino,
  };
}

/** @param {import('../../types/assets.js').AssetRoot} root */
export async function assertAssetRoot(root) {
  await directory(root.path, root);
}

/**
 * @param {import('../../types/assets.js').AssetRoot} root
 * @param {string} path
 * @param {boolean} [createParents]
 */
export async function resolveAssetDirectory(root, path, createParents = false) {
  let parts = path ? assetPath(path).split('/') : [];
  await assertAssetRoot(root);
  let parent = root.path;
  for (let part of parts) {
    parent = join(parent, part);
    if (createParents) {
      try { await mkdir(parent, {
        mode: 0o700,
      }); }
      catch (error) { if (!hasErrorCode(error, 'EEXIST')) { throw error; } }
    }
    await directory(parent);
  }
  await assertAssetRoot(root);
  return parent;
}

/**
 * @param {import('../../types/assets.js').AssetRoot} root
 * @param {string} path
 * @param {boolean} [createParents]
 */
export async function resolveAssetFile(root, path, createParents = false) {
  let parts = assetPath(path).split('/');
  let parent = await resolveAssetDirectory(root, parts.slice(0, -1).join('/'), createParents);
  return join(parent, parts.at(-1) || '');
}

/**
 * @param {string} path
 * @param {number} [maxBytes]
 */
export async function assetFileInfo(path, maxBytes = ASSET_LIMITS.fileBytes) {
  let info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || await realpath(path) !== path) {
    throw new CommandError('Assets must be regular files without symbolic or hard links.');
  }
  if (info.size > maxBytes) {
    throw new CommandError('Asset exceeds the per-file byte limit.', ERROR_CODE.INPUT_TOO_LARGE);
  }
  return info;
}

/**
 * @param {import('node:fs').Stats} before
 * @param {import('node:fs').Stats} after
 */
export function sameAssetFile(before, after) {
  return after.isFile() && after.nlink === 1 && before.dev === after.dev && before.ino === after.ino
    && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs;
}

/**
 * @param {string} path
 * @param {import('node:fs').Stats | undefined} before
 */
export async function assertAssetFileUnchanged(path, before) {
  let after;
  try { after = await assetFileInfo(path, Infinity); }
  catch (error) { if (!hasErrorCode(error, 'ENOENT')) { throw error; } }
  if (before ? !after || !sameAssetFile(before, after) : after !== undefined) {
    throw new CommandError('The asset changed during this operation. Review it before retrying.');
  }
}

/**
 * Read a single bounded file without following source links or accepting concurrent edits.
 * @param {string} source
 */
export async function readAssetSource(source) {
  let path = resolve(source);
  await directoryChain(dirname(path));
  let before = await assetFileInfo(path);
  let handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
  try {
    if (!sameAssetFile(before, await handle.stat())) { throw new CommandError('The asset source changed while opening it.'); }
    let buffer = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < buffer.length) {
      let read = await handle.read(buffer, length, buffer.length - length, length);
      if (!read.bytesRead) { break; }
      length += read.bytesRead;
    }
    await directoryChain(dirname(path));
    await assertAssetFileUnchanged(path, before);
    if (length !== before.size || !sameAssetFile(before, await handle.stat())) {
      throw new CommandError('The asset source changed while reading it.');
    }
    return buffer.subarray(0, length);
  } finally { await handle.close(); }
}

/**
 * @param {import('../../types/assets.js').AssetRoot} root
 * @param {string} path
 */
export async function pruneAssetParents(root, path) {
  let parent = dirname(path);
  while (parent !== root.path) {
    await assertAssetRoot(root);
    await directory(parent);
    try { await rmdir(parent); }
    catch (error) {
      if (hasErrorCode(error, 'ENOTEMPTY') || hasErrorCode(error, 'EEXIST')) { return; }
      throw error;
    }
    parent = dirname(parent);
  }
}

/** @param {unknown} error */
export function assetFailure(error) {
  if (error instanceof CommandError) { return error; }
  return new CommandError('Cannot access local assets. Check that the saved session and regular files exist and are readable.', ERROR_CODE.CACHE_ERROR, EXIT_CODE.RUNTIME_ERROR);
}
