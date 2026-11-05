import { lstatSync, realpathSync } from 'node:fs';
import { definitionPaths } from '../library/paths.js';
import { hasErrorCode } from '../shared/system-error.js';
import { ASSET_PATH } from './constants.js';

/**
 * @param {string} sessionId
 * @param {boolean} [available]
 * @param {string} [directory]
 * @param {import('../../types/assets.js').AssetRoot} [root]
 * @returns {import('../../types/assets.js').AssetStatus}
 */
export function assetStatus(sessionId, available = false, directory = definitionPaths(sessionId).assetsPath, root) {
  let status = {
    configured: /** @type {boolean | null} */ (false),
    available,
    path: `/${sessionId}/${ASSET_PATH}/`,
  };
  try {
    let info = lstatSync(directory);
    status.configured = true;
    if (!info.isDirectory() || info.isSymbolicLink() || realpathSync(directory) !== directory
      || root && (info.dev !== root.dev || info.ino !== root.ino)) { throw new Error('Invalid asset root.'); }
    return status;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT') && !root) { return status; }
    return {
      ...status,
      configured: hasErrorCode(error, 'ENOENT') ? false : status.configured || null,
      available: false,
      error: 'ASSET_ACCESS_DENIED',
    };
  }
}
