import { isPageRequest } from '../server/page-access.js';
import { ASSET_LIMITS } from './constants.js';
import { decodeAssetPath } from './paths.js';
import { AssetHttpError } from './http-errors.js';

/**
 * @param {import('node:http').IncomingMessage} request
 * @param {string} origin
 * @param {import('../../types/session.js').PageAccess} access
 * @param {string} prefix
 */
export function readAssetRequest(request, origin, access, prefix) {
  if (![
    'GET',
    'HEAD',
  ].includes(request.method || '')) { throw new AssetHttpError('METHOD_DENIED'); }
  let headers = request.headers;
  if (headers['transfer-encoding'] || headers['content-length'] && headers['content-length'] !== '0') {
    throw new AssetHttpError('INVALID_REQUEST');
  }
  if (!isPageRequest(request, origin, access)) { throw new AssetHttpError('ORIGIN_DENIED'); }
  // Inspect the raw request target: URL parsing would erase dot segments first.
  let path = request.url?.split('?')[0] || '';
  if (!path.startsWith(prefix) || path === prefix) { throw new AssetHttpError('NOT_FOUND'); }
  if (path.length > prefix.length + ASSET_LIMITS.pathLength * 3) { throw new AssetHttpError('INVALID_REQUEST'); }
  try {
    return decodeAssetPath(path.slice(prefix.length));
  } catch { throw new AssetHttpError('INVALID_REQUEST'); }
}
