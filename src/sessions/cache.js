import { definitionPaths, assertPortableName } from '../library/paths.js';
import { prepareTextFile, readOptional, removeFile } from '../library/files.js';
import { defaultDescription, ensureDescription } from '../library/descriptions.js';

/** @param {string} sessionId */
export function cachePath(sessionId) {
  return definitionPaths(sessionId).htmlPath;
}

/** @param {string} sessionId */
export async function readCachedMarkup(sessionId) {
  await assertPortableName(sessionId);
  return readOptional(cachePath(sessionId));
}

/**
 * @param {string} sessionId
 * @param {string} html
 * @param {string} [description]
 * @returns {Promise<import('../../types/session.js').PreparedCache>}
 */
export async function prepareCachedMarkup(sessionId, html, description = defaultDescription(sessionId)) {
  await assertPortableName(sessionId);
  let paths = definitionPaths(sessionId);
  let pending = await prepareTextFile(paths.htmlPath, html);
  return {
    async commit() {
      let created = false;
      try {
        await assertPortableName(sessionId);
        created = await ensureDescription(sessionId, description);
        await pending.commit();
      } catch (error) {
        if (created && await readOptional(paths.descriptionPath) === description) {
          await removeFile(paths.descriptionPath);
        }
        throw error;
      }
    },
    discard: () => pending.discard(),
  };
}

/** @param {string} sessionId */
export async function clearCachedMarkup(sessionId) {
  await assertPortableName(sessionId);
  let paths = definitionPaths(sessionId);
  await removeFile(paths.htmlPath);
  await removeFile(paths.descriptionPath);
}
