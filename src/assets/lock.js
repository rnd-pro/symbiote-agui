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
 * @param {string} [stateRoot]
 */
export function withAssetLock(sessionId, task, signal, stateRoot = getStateRoot()) {
  return withDirectoryLock(join(stateRoot, '.asset-locks', sessionKey(sessionId)), task, 'assets', signal);
}

/**
 * @template T
 * @param {Array<{ id: string; root: string }>} scopes
 * @param {() => Promise<T>} task
 */
export function withAssetLocks(scopes, task) {
  let unique = Array.from(new Map(scopes.map((scope) => [
    `${scope.root}/${scope.id}`,
    scope,
  ])).values()).sort((a, b) => `${a.root}/${a.id}`.localeCompare(`${b.root}/${b.id}`));
  /**
   * @param {number} index
   * @returns {Promise<T>}
   */
  let next = (index) => index === unique.length ? task()
    : withAssetLock(unique[index].id, () => next(index + 1), undefined, unique[index].root);
  return next(0);
}
