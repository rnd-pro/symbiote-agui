import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { getDefaultStateRoot, stateRootForFolder } from '../../sessions/store.js';
import { transferMarkerPath } from '../../sessions/storage-lock.js';
import { prepareTextFile, prepareNewTextFile, readOptional, removeFile } from '../../library/files.js';
import { assertSessionId } from '../../sessions/identity.js';
import { CommandError } from '../../shared/command-error.js';
import { hasErrorCode } from '../../shared/system-error.js';
import { validProject } from '../identity.js';
import { TRANSFER_FILE_KEYS } from './constants.js';

/** @param {string} id */
export function receiptDirectory(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) { throw new CommandError('Choose a valid transfer receipt.'); }
  return join(getDefaultStateRoot(), '.transfers', id);
}

/** @param {import('../../../types/transfer.js').TransferFiles} files */
export function fileHashes(files) {
  return /** @type {import('../../../types/transfer.js').TransferFiles} */ (Object.fromEntries(TRANSFER_FILE_KEYS.map((key) => [
    key,
    files[key] === null ? null : createHash('sha256').update(files[key]).digest('hex'),
  ])));
}

/** @param {import('../../../types/transfer.js').TransferReceipt} receipt */
export async function saveReceipt(receipt) {
  let path = join(receiptDirectory(receipt.id), 'receipt.json');
  let before = await readOptional(path, 16384);
  let pending = await prepareTextFile(path, JSON.stringify(receipt, null, 2) + '\n', {
    text: before,
    maxBytes: 16384,
  });
  try { await pending.commit(); }
  finally { await pending.discard(); }
}

/** @param {string} id */
export async function readReceipt(id) {
  let raw = await readOptional(join(receiptDirectory(id), 'receipt.json'), 16384);
  if (!raw) { throw new CommandError('Transfer receipt was not found.'); }
  let receipt = /** @type {import('../../../types/transfer.js').TransferReceipt} */ (JSON.parse(raw));
  assertSessionId(receipt.sessionId);
  assertSessionId(receipt.destinationSessionId);
  for (let scope of [
    receipt.source,
    receipt.destination,
  ]) {
    let {
      stateRoot,
      ...project
    } = scope;
    if (!validProject(project) || stateRoot !== stateRootForFolder(project.folder)) { throw new CommandError('Invalid scope in the transfer receipt.'); }
  }
  if (receipt.version !== 1 || receipt.id !== id || ![
    'copy',
    'move',
  ].includes(receipt.kind) || ![
    'preparing',
    'publishing',
    'cleaning-source',
    'complete',
    'needs-recovery',
    'rolled-back',
  ].includes(receipt.state)) { throw new CommandError('Invalid transfer receipt.'); }
  for (let hashes of [
    receipt.sourceHashes,
    receipt.destinationHashes,
  ]) {
    if (!hashes || Object.keys(hashes).length !== TRANSFER_FILE_KEYS.length
      || TRANSFER_FILE_KEYS.some((key) => hashes[key] !== null && !/^[a-f0-9]{64}$/.test(hashes[key] || ''))) { throw new CommandError('Invalid file hashes in the transfer receipt.'); }
  }
  return receipt;
}

/** @param {import('../../../types/transfer.js').TransferReceipt} receipt */
export function markerPaths(receipt) {
  return [
    transferMarkerPath(receipt.destinationSessionId, receipt.destination.stateRoot),
    ...(receipt.kind === 'move' ? [
      transferMarkerPath(receipt.sessionId, receipt.source.stateRoot),
    ] : []),
  ];
}

/** @param {import('../../../types/transfer.js').TransferReceipt} receipt */
export async function markPending(receipt) {
  for (let path of markerPaths(receipt)) {
    let pending = await prepareNewTextFile(path, receipt.id + '\n', receipt.id);
    try { await pending.commit(); }
    finally { await pending.discard(); }
  }
}

/** @param {import('../../../types/transfer.js').TransferReceipt} receipt */
export async function clearMarkers(receipt) {
  for (let path of markerPaths(receipt)) {
    if ((await readOptional(path, 1024))?.trim() === receipt.id) { await removeFile(path); }
  }
}

/**
 * @param {import('../../../types/transfer.js').TransferReceipt} receipt
 * @returns {Promise<import('../../../types/transfer.js').TransferResult>}
 */
export async function transferResult(receipt) {
  let pending = (await Promise.all(markerPaths(receipt).map((path) => readOptional(path, 1024)))).some((raw) => raw?.trim() === receipt.id);
  return {
    ...receipt,
    receiptPath: join(receiptDirectory(receipt.id), 'receipt.json'),
    backupPath: join(receiptDirectory(receipt.id), 'source'),
    recoveryRequired: pending || ![
      'complete',
      'rolled-back',
    ].includes(receipt.state),
  };
}

/** @param {string} stateRoot */
export async function transferHistory(stateRoot) {
  let directory = join(getDefaultStateRoot(), '.transfers');
  let entries = await readdir(directory, {
    withFileTypes: true,
  }).catch((error) => {
    if (hasErrorCode(error, 'ENOENT')) { return []; }
    throw error;
  });
  let ids = entries.filter((entry) => entry.isDirectory() && /^[a-f0-9-]{36}$/.test(entry.name)).map((entry) => entry.name);
  if (ids.length > 2000) { throw new CommandError('Transfer history exceeds its browsing limit. Archive reviewed receipts before continuing.'); }
  /** @type {import('../../../types/transfer.js').TransferResult[]} */
  let results = [];
  for (let id of ids) {
    let receipt = await readReceipt(id);
    if (receipt.source.stateRoot === stateRoot || receipt.destination.stateRoot === stateRoot) { results.push(await transferResult(receipt)); }
  }
  return results.sort((a, b) => Number(b.recoveryRequired) - Number(a.recoveryRequired) || b.createdAt.localeCompare(a.createdAt));
}
