import { join } from 'node:path';
import { getStateRoot } from '../sessions/store.js';
import { assertSessionId, sessionKey } from '../sessions/identity.js';
import { prepareTextFile, readOptional, removeFile, storageError } from '../library/files.js';
import { METADATA_LIMITS } from './constants.js';
import { validateMetadata } from './validate.js';

/** @param {string} sessionId */
export function metadataPath(sessionId) {
  assertSessionId(sessionId);
  return join(getStateRoot(), '.metadata', `${sessionKey(sessionId)}.json`);
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
  let { source, metadata } = await snapshot(sessionId);
  let next = validateMetadata(update(metadata));
  let pending = await prepareTextFile(metadataPath(sessionId), `${JSON.stringify(next)}\n`, { text: source });
  try { await pending.commit(); }
  finally { await pending.discard(); }
  return next;
}

/** @param {string} sessionId */
export async function clearMetadata(sessionId) { await removeFile(metadataPath(sessionId)); }
