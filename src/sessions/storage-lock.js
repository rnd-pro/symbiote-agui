import { join } from 'node:path';
import { getStateRoot } from './store.js';
import { sessionKey } from './identity.js';
import { withDirectoryLock } from '../shared/directory-lock.js';
import { readOptional } from '../library/files.js';
import { CommandError } from '../shared/command-error.js';

/**
 * @param {string} sessionId
 * @param {string} [root]
 */
export function transferMarkerPath(sessionId, root = getStateRoot()) {
  return join(root, '.transfer-pending', `${sessionKey(sessionId.toLowerCase())}.json`);
}

/**
 * @template T
 * @param {string} sessionId
 * @param {() => Promise<T>} task
 * @param {string} [root]
 * @param {string} [transferId]
 */
export function withSessionLock(sessionId, task, root = getStateRoot(), transferId) {
  return withDirectoryLock(join(root, '.storage-locks', sessionKey(sessionId.toLowerCase())), async () => {
    let marker = await readOptional(transferMarkerPath(sessionId, root), 1024);
    if (marker !== undefined && marker.trim() !== transferId) {
      throw new CommandError(`Session ${sessionId} has an unfinished transfer (${marker.trim()}). Open Transfers in the manager to review and recover it.`);
    }
    return task();
  });
}
