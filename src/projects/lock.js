import { withDirectoryLock } from '../shared/directory-lock.js';

/**
 * @template T
 * @param {string} root
 * @param {() => Promise<T>} task
 */
export function withProjectLock(root, task) {
  return withDirectoryLock(root, task, 'projects');
}
