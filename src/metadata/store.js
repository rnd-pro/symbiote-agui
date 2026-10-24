import { join } from 'node:path';
import { getStateRoot } from '../sessions/store.js';
import { assertSessionId, sessionKey } from '../sessions/identity.js';
import { prepareTextFile, readOptional, removeFile, storageError } from '../library/files.js';
import { METADATA_LIMITS } from './constants.js';
import { validateMetadata } from './validate.js';
import { withSessionLock } from '../sessions/storage-lock.js';
import { definitionPaths } from '../library/paths.js';

/**
 * @param {string} sessionId
 * @param {string} [root]
 */
export function metadataPath(sessionId, root = getStateRoot()) {
  assertSessionId(sessionId);
  return join(root, '.metadata', `${sessionKey(sessionId)}.json`);
}

/** @param {string} sessionId */
async function snapshot(sessionId) {
  let path = metadataPath(sessionId);
  let source = await readOptional(path, METADATA_LIMITS.bytes);
  try { return { source, metadata: source === undefined ? {} : validateMetadata(JSON.parse(source)) }; }
  catch { throw storageError(path, new Error('Invalid session metadata.')); }
}

/**
 * @param {string} sessionId
 * @returns {Promise<import('../../types/metadata.js').SessionMetadata>}
 */
export async function readMetadata(sessionId) { return (await snapshot(sessionId)).metadata; }

/**
 * @param {string} sessionId
 * @param {(current: import('../../types/metadata.js').SessionMetadata) => import('../../types/metadata.js').SessionMetadata} update
 */
export async function updateMetadata(sessionId, update) {
  return withSessionLock(sessionId, () => updateLocked(sessionId, update));
}

/**
 * @param {string} sessionId
 * @param {(current: import('../../types/metadata.js').SessionMetadata) => import('../../types/metadata.js').SessionMetadata} update
 */
async function updateLocked(sessionId, update) {
  if (await readOptional(definitionPaths(sessionId).htmlPath) === undefined) { throw new Error('The saved definition no longer exists. Refresh before updating metadata.'); }
  let { source, metadata } = await snapshot(sessionId);
  let next = validateMetadata(update(metadata));
  let pending = await prepareTextFile(metadataPath(sessionId), `${JSON.stringify(next)}\n`, { text: source });
  try { await pending.commit(); }
  finally { await pending.discard(); }
  return next;
}

/** @param {string} sessionId */
export async function clearMetadata(sessionId) { await removeFile(metadataPath(sessionId)); }
