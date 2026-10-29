import { join } from 'node:path';
import { prepareNewTextFile, readOptional, removeFile } from '../../library/files.js';
import { CommandError } from '../../shared/command-error.js';
import { assertProjectFolder } from '../identity.js';
import { TRANSFER_FILE_KEYS } from './constants.js';
import { readReceipt, saveReceipt, clearMarkers, transferResult, receiptDirectory, fileHashes } from './receipts.js';
import { transferPaths, lockTransfer, quarantinePath } from './scope.js';
import { readTransferFiles } from './snapshot.js';
import { assertStopped } from './service.js';

/**
 * @param {string} id
 * @param {string} stateRoot
 * @returns {Promise<import('../../../types/manager.js').ManagerResult>}
 */
export async function recoverTransfer(id, stateRoot) {
  let receipt = await readReceipt(id);
  if (receipt.source.stateRoot !== stateRoot && receipt.destination.stateRoot !== stateRoot) { throw new CommandError('This transfer belongs to another manager scope.'); }
  return lockTransfer(receipt, async () => {
    receipt = await readReceipt(id);
    if (receipt.state === 'complete' || receipt.state === 'rolled-back') {
      await clearMarkers(receipt);
      return {
        ok: true,
        transfer: await transferResult(receipt),
      };
    }
    for (let scope of [
      receipt.source,
      receipt.destination,
    ]) { if (scope.folder) { await assertProjectFolder(scope.folder); } }
    await assertStopped(receipt.destination, receipt.destinationSessionId);
    if (receipt.kind === 'move') { await assertStopped(receipt.source, receipt.sessionId); }
    let paths = transferPaths(receipt.destination, receipt.destinationSessionId);
    let sourcePaths = transferPaths(receipt.source, receipt.sessionId);
    let destination = await readTransferFiles(paths);
    let actualHashes = fileHashes(destination);
    for (let key of TRANSFER_FILE_KEYS) {
      if (destination[key] !== null && actualHashes[key] !== receipt.destinationHashes[key]) {
        throw new CommandError(`Destination ${key} changed after the transfer. Keep both copies and reconcile it before recovery. Receipt: ${id}`);
      }
    }
    if (receipt.kind === 'move') {
      let source = await readTransferFiles(sourcePaths);
      let hashes = fileHashes(source);
      /** @type {Map<import('../../../types/transfer.js').TransferFileKey, string>} */
      let restore = new Map();
      for (let key of TRANSFER_FILE_KEYS) {
        let quarantine = await readOptional(quarantinePath(sourcePaths[key], id), 1024 * 1024 + 1024);
        if (source[key] !== null) {
          if (quarantine !== undefined ? source[key] !== quarantine : hashes[key] !== receipt.sourceHashes[key]) {
            throw new CommandError(`Source ${key} changed. Recovery will not overwrite it. Keep both copies and reconcile this receipt: ${id}`);
          }
          continue;
        }
        if (receipt.sourceHashes[key] === null) { continue; }
        let text = quarantine ?? await readOptional(join(receiptDirectory(id), 'source', key), 1024 * 1024 + 1024);
        if (text === undefined) { throw new CommandError(`Source backup ${key} is unavailable. Keep the destination and receipt ${id}.`); }
        if (quarantine === undefined && fileHashes({
          proxy: null,
          html: null,
          description: null,
          data: null,
          metadata: null,
          [key]: text,
        })[key] !== receipt.sourceHashes[key]) { throw new CommandError('The source backup changed. Recovery stopped without overwriting files.'); }
        restore.set(key, text);
      }
      for (let [key, text] of restore) {
        let pending = await prepareNewTextFile(sourcePaths[key], text, `${id}-restore`);
        try { await pending.commit(); }
        finally { await pending.discard(); }
      }
      for (let key of TRANSFER_FILE_KEYS) {
        await removeFile(quarantinePath(sourcePaths[key], id));
        let temporary = `${sourcePaths[key]}.${id}-restore.tmp`;
        let text = await readOptional(temporary, 1024 * 1024 + 1024);
        if (text !== undefined && text === await readOptional(sourcePaths[key], 1024 * 1024 + 1024)) { await removeFile(temporary); }
      }
    }
    for (let key of TRANSFER_FILE_KEYS) {
      if (destination[key] !== null) { await removeFile(paths[key]); }
      let temporary = `${paths[key]}.${id}.tmp`;
      let text = await readOptional(temporary, 1024 * 1024 + 1024);
      if (text !== undefined && fileHashes({
        proxy: null,
        html: null,
        description: null,
        data: null,
        metadata: null,
        [key]: text,
      })[key] === receipt.destinationHashes[key]) { await removeFile(temporary); }
    }
    receipt.state = 'rolled-back';
    delete receipt.error;
    await saveReceipt(receipt);
    await clearMarkers(receipt);
    return {
      ok: true,
      transfer: await transferResult(receipt),
    };
  });
}
