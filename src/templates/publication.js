import { prepareNewTextFile, readOptional, removeFile } from '../library/files.js';
import { assertAssetFileUnchanged, assetFileInfo } from '../assets/files.js';
import { copyAssetTree, assertAssetOwnership, removeAssetTree } from '../assets/tree.js';
import { assertAssetSubset, snapshotAssetTree } from '../assets/manifest.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';

/**
 * Caller holds the session and asset locks and has checked destination absence.
 * @param {string} sourceAssets
 * @param {string} destinationAssets
 * @param {import('../../types/assets.js').AssetManifest | null} manifest
 * @param {Array<{ path: string; text: string }>} files
 * @param {{ beforePublish?: () => Promise<void> }} [hooks]
 */
export async function publishTemplate(sourceAssets, destinationAssets, manifest, files, hooks = {}) {
  /** @type {Array<{ path: string; text: string; pending: import('../../types/library.js').PreparedNewFile; published: boolean }>} */
  let staged = [];
  /** @type {import('../../types/assets.js').AssetRoot | undefined} */
  let assetOwner;
  try {
    for (let file of files) {
      staged.push({
        ...file,
        pending: await prepareNewTextFile(file.path, file.text),
        published: false,
      });
    }
    await copyAssetTree(sourceAssets, destinationAssets, manifest, async (owner) => { assetOwner = owner; });
    await hooks.beforePublish?.();
    // HTML is last, so a discoverable definition has its description and assets.
    for (let file of staged) {
      await file.pending.commit();
      file.published = true;
      await file.pending.discard();
    }
  } catch (error) {
    // Discard staging links before checking regular-file ownership for rollback.
    let cleanup = await Promise.allSettled(staged.map((file) => file.pending.discard()));
    let cleanupFailed = cleanup.some((result) => result.status === 'rejected');
    for (let file of staged.toReversed().filter((file) => file.published)) {
      try { await rollbackFile(file); }
      catch { cleanupFailed = true; }
    }
    if (assetOwner) {
      try {
        await assertAssetOwnership(destinationAssets, assetOwner);
        let partial = await snapshotAssetTree(destinationAssets);
        assertAssetSubset(partial, manifest);
        await removeAssetTree(destinationAssets, partial);
      } catch { cleanupFailed = true; }
    }
    if (cleanupFailed) {
      throw new CommandError('Template creation failed and some destination files changed. Preserve them and reconcile the saved paths before retrying.', ERROR_CODE.CACHE_ERROR, EXIT_CODE.RUNTIME_ERROR);
    }
    if (hasErrorCode(error, 'EEXIST')) { throw new CommandError('The destination changed during template creation. Choose another session ID or reconcile its files.'); }
    throw error;
  } finally {
    await Promise.all(staged.map((file) => file.pending.discard()));
  }
}

/**
 * @param {{ path: string; text: string; pending: import('../../types/library.js').PreparedNewFile }} file
 */
async function rollbackFile(file) {
  let info;
  try { info = await assetFileInfo(file.path); }
  catch (error) { if (hasErrorCode(error, 'ENOENT')) { return; } throw error; }
  if (info.dev !== file.pending.identity.dev || info.ino !== file.pending.identity.ino
    || await readOptional(file.path) !== file.text) {
    throw new Error('A published template file changed.');
  }
  await assertAssetFileUnchanged(file.path, info);
  await removeFile(file.path);
}
