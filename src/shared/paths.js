import { realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { hasErrorCode } from './system-error.js';

/**
 * @param {string} path
 * @returns {string}
 */
export function canonicalPath(path) {
  try { return realpathSync(path); }
  catch (error) {
    if (!hasErrorCode(error, 'ENOENT')) { throw error; }
    let absolute = resolve(path);
    let parent = dirname(absolute);
    return parent === absolute ? absolute : join(canonicalPath(parent), basename(absolute));
  }
}
