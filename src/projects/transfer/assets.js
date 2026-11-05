import { lstat, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { CommandError } from '../../shared/command-error.js';
import { hasErrorCode } from '../../shared/system-error.js';
import { snapshotAssetTree, assertAssetManifest, assertAssetSubset } from '../../assets/manifest.js';
import { copyAssetTree, fillAssetTree, removeAssetTree, assertAssetOwnership } from '../../assets/tree.js';
import { transferAssetPath, quarantinePath } from './scope.js';
import { receiptDirectory, saveReceipt } from './receipts.js';

/**
 * @param {import('../../../types/transfer.js').TransferReceipt} receipt
 * @param {'source' | 'destination'} side
 */
function backupPath(receipt, side) {
  return join(receiptDirectory(receipt.id), side, 'assets');
}

/** @param {import('../../../types/transfer.js').TransferReceipt} receipt */
export async function backupTransferAssets(receipt) {
  let source = transferAssetPath(receipt.source, receipt.sessionId);
  if (receipt.kind === 'move') { await copyAssetTree(source, backupPath(receipt, 'source'), receipt.assets ?? null); }
  await copyAssetTree(source, backupPath(receipt, 'destination'), receipt.assets ?? null);
}

/** @param {import('../../../types/transfer.js').TransferReceipt} receipt */
export async function publishTransferAssets(receipt) {
  await copyAssetTree(backupPath(receipt, 'destination'), transferAssetPath(receipt.destination, receipt.destinationSessionId), receipt.assets ?? null, async (root) => {
    receipt.assetDestinationRoot = {
      dev: root.dev,
      ino: root.ino,
    };
    await saveReceipt(receipt);
  });
}

/**
 * @param {import('../../../types/transfer.js').TransferReceipt} receipt
 * @param {((key: string) => Promise<void>) | undefined} beforeRemove
 */
export async function removeTransferAssets(receipt, beforeRemove) {
  let source = transferAssetPath(receipt.source, receipt.sessionId);
  assertAssetManifest(await snapshotAssetTree(source), receipt.assets ?? null);
  if (!receipt.assets) { return; }
  await beforeRemove?.('assets');
  let quarantine = quarantinePath(source, receipt.id);
  try {
    await lstat(quarantine);
    throw new CommandError('An asset quarantine already exists. Recover the transfer before continuing.');
  } catch (error) { if (!hasErrorCode(error, 'ENOENT')) { throw error; } }
  await rename(source, quarantine);
  assertAssetManifest(await snapshotAssetTree(quarantine), receipt.assets);
  receipt.assetCleanupStarted = true;
  await saveReceipt(receipt);
  await removeAssetTree(quarantine, receipt.assets);
}

/**
 * Validate all asset recovery inputs before restoring or removing any artifact.
 * @param {import('../../../types/transfer.js').TransferReceipt} receipt
 */
export async function prepareAssetRecovery(receipt) {
  let target = transferAssetPath(receipt.destination, receipt.destinationSessionId);
  let destination = await snapshotAssetTree(target);
  let expected = receipt.assets ?? null;
  if (destination) {
    if (!receipt.assetDestinationRoot) { throw new CommandError('Destination assets have no recorded transfer ownership. Preserve them and reconcile the receipt.'); }
    await assertAssetOwnership(target, receipt.assetDestinationRoot);
    assertAssetSubset(destination, expected);
  }
  let source = transferAssetPath(receipt.source, receipt.sessionId);
  let quarantine = quarantinePath(source, receipt.id);
  let retained = receipt.kind === 'move' ? await snapshotAssetTree(quarantine) : null;
  let current = receipt.kind === 'move' ? await snapshotAssetTree(source) : null;
  let desired = receipt.assetRestoredManifest !== undefined ? receipt.assetRestoredManifest
    : retained && !receipt.assetCleanupStarted ? retained : expected;
  let origin = retained && !receipt.assetCleanupStarted ? quarantine : backupPath(receipt, 'source');
  let restore = receipt.kind === 'move' && desired !== null;
  let complete = JSON.stringify(current) === JSON.stringify(desired);
  if (receipt.kind === 'move') {
    if (receipt.assetCleanupStarted) { assertAssetSubset(retained, expected); }
    if (retained && receipt.assetRestoredManifest !== undefined) { assertAssetSubset(retained, desired); }
    if (current) {
      if (receipt.assetRestoredRoot) {
        await assertAssetOwnership(source, receipt.assetRestoredRoot);
        assertAssetSubset(current, desired);
      } else { assertAssetManifest(current, desired, 'Source assets changed. Recovery will not overwrite them.'); }
    }
    if (restore && !complete) { assertAssetManifest(await snapshotAssetTree(origin), desired, 'The source asset backup is missing or changed.'); }
  }
  return {
    async restore() {
      if (!restore || !desired) { return; }
      if (!current) {
        await copyAssetTree(origin, source, desired, async (root) => {
          receipt.assetRestoredRoot = {
            dev: root.dev,
            ino: root.ino,
          };
          receipt.assetRestoredManifest = desired;
          await saveReceipt(receipt);
        });
      } else if (!complete && receipt.assetRestoredRoot) { await fillAssetTree(origin, source, desired); }
      // Retain the restored revision even if a changed quarantine is later removed.
      receipt.assetRestoredManifest = desired;
      await saveReceipt(receipt);
    },
    async cleanup() {
      if (destination) {
        await assertAssetOwnership(target, /** @type {import('../../../types/assets.js').AssetIdentity} */ (receipt.assetDestinationRoot));
        assertAssetManifest(await snapshotAssetTree(target), destination);
        await removeAssetTree(target, destination);
      }
      if (retained) { await removeAssetTree(quarantine, retained); }
    },
  };
}
