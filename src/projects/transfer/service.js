import { randomUUID } from 'node:crypto';
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { prepareNewTextFile, readOptional, removeFile } from '../../library/files.js';
import { defaultDescription } from '../../library/descriptions.js';
import { mergeSavedData } from '../../data/markup.js';
import { readRuntimeCache, runtimeCacheText } from '../../data/cache.js';
import { isProcessAlive, readScopedSession, releaseScopedSession } from '../../sessions/store.js';
import { requestSession } from '../../sessions/client.js';
import { CommandError } from '../../shared/command-error.js';
import { ERROR_CODE } from '../../shared/constants.js';
import { errorMessage } from '../../shared/system-error.js';
import { TRANSFER_FILE_KEYS } from './constants.js';
import { transferScope, transferPaths, lockTransfer, assertDestinationEmpty, quarantinePath } from './scope.js';
import { captureTransferSnapshot, readTransferFiles, assertFilesMatch } from './snapshot.js';
import { fileHashes, receiptDirectory, saveReceipt, markPending, clearMarkers, transferResult } from './receipts.js';
import { checkTransferDependencies } from './dependencies.js';

/**
 * @param {import('../../../types/transfer.js').TransferScope} scope
 * @param {string} sessionId
 */
export async function assertStopped(scope, sessionId) {
  let record = await readScopedSession(sessionId, scope.stateRoot);
  if (record && isProcessAlive(record.pid)) {
    throw new CommandError('The session is running, starting, or unreachable. Save or export browser drafts and stop it before moving, renaming, or recovering it.');
  }
  return record;
}

/**
 * @param {string} path
 * @param {string} text
 * @param {string} id
 */
async function writeNew(path, text, id) {
  let pending = await prepareNewTextFile(path, text, id);
  try { await pending.commit(); }
  finally { await pending.discard(); }
}

/**
 * @param {import('../../../types/transfer.js').TransferReceipt} receipt
 * @param {import('../../../types/transfer.js').TransferFiles} files
 * @param {'source' | 'destination'} side
 */
async function backup(receipt, files, side) {
  for (let key of TRANSFER_FILE_KEYS) {
    let text = files[key];
    if (text !== null) { await writeNew(join(receiptDirectory(receipt.id), side, key), text, receipt.id); }
  }
}

/**
 * @param {string} sourceProjectId
 * @param {import('../../../types/transfer.js').TransferInput} input
 * @param {{ beforePublish?: () => Promise<void>; afterPublish?: () => Promise<void>; beforeRemove?: (key: string) => Promise<void> }} [hooks]
 * @returns {Promise<import('../../../types/manager.js').ManagerResult>}
 */
export async function transferSession(sourceProjectId, input, hooks = {}) {
  let source = await transferScope(sourceProjectId);
  let destination = await transferScope(input.destinationProjectId);
  if (source.id === destination.id && input.sessionId.toLowerCase() === input.destinationSessionId.toLowerCase()) {
    throw new CommandError('Choose another project or an ID that differs beyond letter case.');
  }
  let record = await readScopedSession(input.sessionId, source.stateRoot);
  /** @type {import('../../../types/transfer.js').TransferSnapshot | undefined} */
  let captured;
  if (record && isProcessAlive(record.pid)) {
    if (input.kind === 'move') { await assertStopped(source, input.sessionId); }
    let reply = await requestSession(record, 'transfer-snapshot', 35000);
    captured = reply.transferSnapshot;
    if (!captured) { throw new CommandError('This worker cannot capture a consistent transfer snapshot. Stop and restart it before copying.'); }
  }
  let empty = {
    proxy: null,
    html: null,
    description: null,
    metadata: null,
    data: null,
  };
  /** @type {import('../../../types/transfer.js').TransferReceipt} */
  let receipt = {
    ...input,
    version: 1,
    id: randomUUID(),
    source,
    destination,
    state: 'preparing',
    createdAt: new Date().toISOString(),
    sourceHashes: empty,
    destinationHashes: empty,
  };
  return lockTransfer(receipt, async () => {
    if (source.folder) { await transferScope(source.id); }
    if (destination.folder) { await transferScope(destination.id); }
    if (input.kind === 'move') { await assertStopped(source, input.sessionId); }
    await assertStopped(destination, input.destinationSessionId);
    await assertDestinationEmpty(destination, input.destinationSessionId);
    let snapshot = await captureTransferSnapshot(source, input.sessionId);
    if (captured) { assertFilesMatch(snapshot.files, captured.files); }
    let files = snapshot.files;
    let html = files.html;
    if (html === null) { throw new CommandError('The source definition is missing.'); }
    await checkTransferDependencies(html, destination.folder);
    let cache = input.includeData ? await readRuntimeCache(input.sessionId, source.stateRoot) : undefined;
    let planned = {
      proxy: files.proxy,
      html,
      description: files.description ?? defaultDescription(input.sessionId),
      metadata: input.includeMetadata ? files.metadata : null,
      data: cache ? runtimeCacheText(mergeSavedData(html, cache.html), html, randomUUID()) : null,
    };
    receipt.sourceHashes = fileHashes(files);
    receipt.destinationHashes = fileHashes(planned);
    let paths = transferPaths(destination, input.destinationSessionId);
    let sourcePaths = transferPaths(source, input.sessionId);
    /** @type {import('../../../types/session.js').PreparedCache[]} */
    let staged = [];
    await saveReceipt(receipt);
    try {
      if (input.kind === 'move') { await backup(receipt, files, 'source'); }
      await backup(receipt, planned, 'destination');
      for (let key of TRANSFER_FILE_KEYS) {
        let text = planned[key];
        if (text !== null) { staged.push(await prepareNewTextFile(paths[key], text, receipt.id)); }
      }
      await markPending(receipt);
      receipt.state = 'publishing';
      await saveReceipt(receipt);
      // HTML is the last publication and makes the completed definition discoverable.
      await hooks.beforePublish?.();
      for (let pending of staged) { await pending.commit(); }
      assertFilesMatch(await readTransferFiles(paths), planned);
      await hooks.afterPublish?.();
      if (input.kind === 'move') {
        await assertStopped(source, input.sessionId);
        assertFilesMatch(await readTransferFiles(sourcePaths), files);
        receipt.state = 'cleaning-source';
        await saveReceipt(receipt);
        for (let key of TRANSFER_FILE_KEYS) {
          if (files[key] === null) { continue; }
          await hooks.beforeRemove?.(key);
          let quarantine = quarantinePath(sourcePaths[key], receipt.id);
          await rename(sourcePaths[key], quarantine);
          if (await readOptional(quarantine, 1024 * 1024 + 1024) !== files[key]) {
            throw new CommandError(`The source changed during removal. Its current file is retained at ${quarantine}. Recover this transfer before continuing.`);
          }
          await removeFile(quarantine);
        }
        let stopped = await assertStopped(source, input.sessionId);
        if (stopped) { await releaseScopedSession(stopped, source.stateRoot); }
      }
      receipt.state = 'complete';
      await saveReceipt(receipt);
      await clearMarkers(receipt);
      return {
        ok: true,
        transfer: await transferResult(receipt),
      };
    } catch (error) {
      receipt.state = 'needs-recovery';
      receipt.error = errorMessage(error);
      await saveReceipt(receipt);
      return {
        ok: false,
        transfer: await transferResult(receipt),
        error: {
          code: ERROR_CODE.CACHE_ERROR,
          message: `Transfer incomplete: ${receipt.error} Review Transfers before retrying. Receipt: ${join(receiptDirectory(receipt.id), 'receipt.json')}`,
        },
      };
    } finally {
      for (let pending of staged) { await pending.discard().catch(() => {}); }
    }
  });
}
