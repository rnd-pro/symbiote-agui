import { readdir } from 'node:fs/promises';
import { SESSION_ID_PATTERN } from './constants.js';
import { getStateRoot } from './store.js';
import { hasErrorCode } from '../shared/system-error.js';
import { listDefinitionIds } from '../library/paths.js';

/** @param {string} key */
function decodeSessionKey(key) {
  if (!/^(?:[a-f0-9]{2}){1,64}$/.test(key)) { return undefined; }
  let sessionId = Buffer.from(key, 'hex').toString('utf8');
  return SESSION_ID_PATTERN.test(sessionId) ? sessionId : undefined;
}

/** @param {string} path */
async function readEntries(path) {
  try { return await readdir(path, { withFileTypes: true }); }
  catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { return []; }
    throw error;
  }
}

/** @param {boolean} includeCached */
export async function listSessionIds(includeCached) {
  let root = getStateRoot();
  let [workers, cached] = await Promise.all([
    readEntries(root),
    includeCached ? listDefinitionIds() : [],
  ]);
  let keys = [
    ...workers.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  ];
  let ids = keys.map(decodeSessionKey).filter((id) => id !== undefined);
  return [...new Set([...ids, ...cached])].sort();
}
