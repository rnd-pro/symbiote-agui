import { readOptional } from '../../library/files.js';
import { analyzeMarkup } from '../../markup/analyze.js';
import { validateMetadata } from '../../metadata/validate.js';
import { validateProxyPolicy } from '../../proxy/policy.js';
import { PROXY_LIMITS } from '../../proxy/constants.js';
import { readRuntimeCache, sourceHash } from '../../data/cache.js';
import { mergeSavedData } from '../../data/markup.js';
import { transferPaths } from './scope.js';
import { TRANSFER_FILE_KEYS } from './constants.js';
import { CommandError } from '../../shared/command-error.js';
import { MAX_HTML_BYTES } from '../../markup/constants.js';
import { METADATA_LIMITS } from '../../metadata/constants.js';
import { lstat } from 'node:fs/promises';
import { hasErrorCode } from '../../shared/system-error.js';

/**
 * @param {Record<import('../../../types/transfer.js').TransferFileKey, string>} paths
 * @returns {Promise<import('../../../types/transfer.js').TransferFiles>}
 */
export async function readTransferFiles(paths) {
  return /** @type {import('../../../types/transfer.js').TransferFiles} */ (Object.fromEntries(await Promise.all(TRANSFER_FILE_KEYS.map(async (key) => {
    try {
      let entry = await lstat(paths[key]);
      if (!entry.isFile() || entry.isSymbolicLink()) { throw new CommandError('Transfer artifacts must be regular files, not symbolic links or directories.'); }
    } catch (error) {
      if (!hasErrorCode(error, 'ENOENT')) { throw error; }
    }
    return [
      key,
      await readOptional(paths[key], 1024 * 1024 + 1024) ?? null,
    ];
  }))));
}

/**
 * @param {import('../../../types/transfer.js').TransferScope} scope
 * @param {string} sessionId
 * @param {string} [acceptedSource]
 * @param {string} [acceptedData]
 * @param {string | null} [acceptedProxy]
 * @returns {Promise<import('../../../types/transfer.js').TransferSnapshot>}
 */
export async function captureTransferSnapshot(scope, sessionId, acceptedSource, acceptedData, acceptedProxy) {
  let files = await readTransferFiles(transferPaths(scope, sessionId));
  if (files.html === null) { throw new CommandError('Save a definition before copying or moving this session.'); }
  if (Buffer.byteLength(files.html) > MAX_HTML_BYTES || files.description !== null && Buffer.byteLength(files.description) > MAX_HTML_BYTES
    || files.proxy !== null && Buffer.byteLength(files.proxy) > PROXY_LIMITS.policyBytes
    || files.metadata !== null && Buffer.byteLength(files.metadata) > METADATA_LIMITS.bytes) { throw new CommandError('Saved artifacts exceed their supported size limits.'); }
  if (acceptedSource !== undefined && (acceptedSource !== files.html || (acceptedData ?? null) !== files.data)) {
    throw new CommandError('Saved files differ from the running worker. Sync or reconcile the source before copying.');
  }
  if (acceptedProxy !== undefined && files.proxy !== acceptedProxy) {
    throw new CommandError('Saved proxy policy differs from the running worker. Sync before copying.');
  }
  if (files.proxy !== null) { validateProxyPolicy(JSON.parse(files.proxy)); }
  analyzeMarkup(files.html);
  if (files.metadata !== null) { validateMetadata(JSON.parse(files.metadata)); }
  let cache = await readRuntimeCache(sessionId, scope.stateRoot);
  if (cache) {
    let html;
    try { html = mergeSavedData(files.html, cache.html); }
    catch { throw new CommandError('The source definition conflicts with committed data. Reconcile it before transferring.'); }
    analyzeMarkup(html);
    if (cache.sourceHash === sourceHash(files.html) && cache.html !== html) { throw new CommandError('The saved data snapshot is incompatible with the definition.'); }
  }
  return {
    files,
  };
}

/**
 * @param {import('../../../types/transfer.js').TransferFiles} actual
 * @param {import('../../../types/transfer.js').TransferFiles} expected
 */
export function assertFilesMatch(actual, expected) {
  if (TRANSFER_FILE_KEYS.some((key) => actual[key] !== (expected[key] ?? null))) { throw new CommandError('Session files changed during the transfer. No source files will be removed. Review and retry.'); }
}
