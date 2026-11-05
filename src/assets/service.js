import { lstat, unlink } from 'node:fs/promises';
import { basename } from 'node:path';
import { definitionPaths, assertPortableName } from '../library/paths.js';
import { prepareFile } from '../library/files.js';
import { withSessionLock } from '../sessions/storage-lock.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';
import { ASSET_LIMITS } from './constants.js';
import { assetContentType, assetEntry, assetPath, assertAssetName } from './paths.js';
import { scanAssets } from './inventory.js';
import { withAssetLock } from './lock.js';
import { assetRoot, assertAssetRoot, assetFileInfo, assertAssetFileUnchanged, assetFailure, readAssetSource, resolveAssetFile, pruneAssetParents } from './files.js';

/**
 * @param {string} directory
 * @param {Extract<import('../../types/assets.js').AssetCliRequest, { command: 'add' }>} request
 * @returns {Promise<import('../../types/assets.js').AssetResult>}
 */
async function addAsset(directory, request) {
  let name = assetPath(request.path ?? basename(request.file));
  assetContentType(name);
  let inventory = await scanAssets(directory);
  assertAssetName(inventory, name);
  let existing = inventory.entries.find((entry) => entry.path === name);
  if (existing && !request.replace) { throw new CommandError('Asset already exists. Use --replace to replace the reviewed file explicitly.'); }
  let data = await readAssetSource(request.file);
  let parents = name.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'));
  let newParents = parents.filter((parent) => !inventory.directories.includes(parent));
  if (inventory.entries.length + (existing ? 0 : 1) > ASSET_LIMITS.files
    || inventory.entries.length + inventory.directories.length + newParents.length + (existing ? 0 : 1) > ASSET_LIMITS.entries
    || inventory.totalBytes - (existing?.size ?? 0) + data.length > ASSET_LIMITS.totalBytes) {
    throw new CommandError('Import would exceed the asset tree limits.', ERROR_CODE.INPUT_TOO_LARGE);
  }
  let root = inventory.root ?? await assetRoot(directory, true);
  if (!root) { throw new CommandError('Cannot create the session asset directory.'); }
  let destination = await resolveAssetFile(root, name, true);
  let before = existing ? await assetFileInfo(destination) : undefined;
  await assertAssetFileUnchanged(destination, before);
  let pending = await prepareFile(destination, data, {
    replace: !!existing,
  });
  try {
    await assertAssetRoot(root);
    await resolveAssetFile(root, name);
    await assertAssetFileUnchanged(destination, before);
    await pending.commit();
  } finally { await pending.discard(); }
  return {
    sessionId: request.sessionId,
    command: 'assets add',
    replaced: !!existing,
    asset: assetEntry(name, data.length),
  };
}

/**
 * @param {string} directory
 * @param {Extract<import('../../types/assets.js').AssetCliRequest, { command: 'remove' }>} request
 * @returns {Promise<import('../../types/assets.js').AssetResult>}
 */
async function removeAsset(directory, request) {
  let root = await assetRoot(directory);
  if (!root) { throw new CommandError('This session has no published assets.'); }
  let path = await resolveAssetFile(root, request.path);
  // Removal also lets an owner repair manually added unsupported or oversized files.
  let before = await assetFileInfo(path, Infinity);
  await assertAssetRoot(root);
  await assertAssetFileUnchanged(path, before);
  await unlink(path);
  await pruneAssetParents(root, path);
  return {
    sessionId: request.sessionId,
    command: 'assets remove',
    removed: request.path,
  };
}

/**
 * @param {import('../../types/assets.js').AssetCliRequest} request
 * @returns {Promise<import('../../types/assets.js').AssetResult>}
 */
export async function runAssetCommand(request) {
  try {
    return await withSessionLock(request.sessionId, () => withAssetLock(request.sessionId, async () => {
      await assertPortableName(request.sessionId);
      let paths = definitionPaths(request.sessionId);
      let saved;
      try { saved = await lstat(paths.htmlPath); }
      catch (error) { if (!hasErrorCode(error, 'ENOENT')) { throw error; } }
      if (!saved?.isFile() || saved.isSymbolicLink()) { throw new CommandError('No regular saved AGUI definition. Use save or insert before managing assets.'); }
      if (request.command === 'add') { return addAsset(paths.assetsPath, request); }
      if (request.command === 'remove') { return removeAsset(paths.assetsPath, request); }
      let inventory = await scanAssets(paths.assetsPath);
      return {
        sessionId: request.sessionId,
        command: 'assets list',
        total: inventory.entries.length,
        totalBytes: inventory.totalBytes,
        offset: request.offset,
        limit: request.limit,
        assets: inventory.entries.slice(request.offset, request.offset + request.limit),
      };
    }));
  } catch (error) { throw assetFailure(error); }
}
