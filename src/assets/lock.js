import { join } from 'node:path';
import { withDirectoryLock } from '../shared/directory-lock.js';
import { getStateRoot } from '../sessions/store.js';
import { sessionKey } from '../sessions/identity.js';

/**
 * Keep publication and HTTP file preparation consistent without acquiring the
 * session lock that may already be waiting for browser render/module loading.
 * @template T
 * @param {string} sessionId
 * @param {() => Promise<T>} task
 * @param {AbortSignal} [signal]
 */
export function withAssetLock(sessionId, task, signal) {
  return withDirectoryLock(join(getStateRoot(), '.asset-locks', sessionKey(sessionId)), task, 'assets', signal);
}
