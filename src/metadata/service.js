import { readCachedMarkup } from '../sessions/cache.js';
import { CommandError } from '../shared/command-error.js';
import { METADATA_KEYS } from './constants.js';
import { validateMetadata } from './validate.js';
import { readMetadata, updateMetadata } from './store.js';

/** @param {string} sessionId */
async function assertSaved(sessionId) {
  if (await readCachedMarkup(sessionId) === undefined) {
    throw new CommandError(`No saved AGUI named ${sessionId}. Use save or insert first.`);
  }
}

/**
 * @param {string} sessionId
 * @returns {Promise<import('../../types/metadata.js').SessionMetadataResult>}
 */
export async function getSessionMetadata(sessionId) {
  await assertSaved(sessionId);
  return { sessionId, metadata: await readMetadata(sessionId) };
}

/**
 * @param {string} sessionId
 * @param {unknown} input
 */
export async function setSessionMetadata(sessionId, input) {
  let patch = validateMetadata(input);
  await assertSaved(sessionId);
  let metadata = await updateMetadata(sessionId, (current) => ({ ...current, ...patch }));
  return { sessionId, metadata };
}

/**
 * @param {string} sessionId
 * @param {string} key
 */
export async function clearSessionMetadata(sessionId, key) {
  if (!METADATA_KEYS.includes(key)) { throw new CommandError('Unknown metadata key.'); }
  await assertSaved(sessionId);
  let metadata = await updateMetadata(sessionId, (current) => {
    delete current[/** @type {keyof typeof current} */ (key)];
    return current;
  });
  return { sessionId, metadata };
}
