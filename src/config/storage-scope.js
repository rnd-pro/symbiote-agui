import { AsyncLocalStorage } from 'node:async_hooks';

/** @type {AsyncLocalStorage<{ folder: string | undefined }>} */
let storage = new AsyncLocalStorage();

export function currentStorageScope() { return storage.getStore(); }

/**
 * @template T
 * @param {string | undefined} folder
 * @param {() => T} task
 * @returns {T}
 */
export function withStorageFolder(folder, task) {
  return storage.run({
    folder,
  }, task);
}
