import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';

let failures = Object.freeze({
  INVALID_REQUEST: {
    status: 400,
    message: 'Use a valid session-relative asset path without a request body.',
  },
  METHOD_DENIED: {
    status: 405,
    message: 'Local assets accept GET and HEAD only.',
  },
  ORIGIN_DENIED: {
    status: 403,
    message: 'Load local assets from the session page origin.',
  },
  ACCESS_DENIED: {
    status: 403,
    message: 'The asset tree is invalid or cannot be accessed safely.',
  },
  NOT_FOUND: {
    status: 404,
    message: 'No published asset exists at this path.',
  },
  UNSUPPORTED_TYPE: {
    status: 415,
    message: 'This asset type is not supported.',
  },
  TOO_LARGE: {
    status: 413,
    message: 'The published asset tree exceeds its supported limits.',
  },
  BUSY: {
    status: 429,
    message: 'Too many local asset requests are active. Retry later.',
  },
  CHANGED: {
    status: 409,
    message: 'The asset changed during delivery. Reload to request its current version.',
  },
  TIMEOUT: {
    status: 504,
    message: 'The local asset request timed out.',
  },
  STOPPED: {
    status: 503,
    message: 'The session asset server is stopping.',
  },
  FAILED: {
    status: 500,
    message: 'The local asset could not be read.',
  },
});

export class AssetHttpError extends Error {
  /** @param {keyof typeof failures} key */
  constructor(key) {
    super(failures[key].message);
    this.code = `ASSET_${key}`;
    this.status = failures[key].status;
  }
}

/** @param {unknown} error */
export function assetHttpError(error) {
  if (error instanceof AssetHttpError) { return error; }
  if (hasErrorCode(error, 'ENOENT') || hasErrorCode(error, 'ENOTDIR')) { return new AssetHttpError('NOT_FOUND'); }
  if (error instanceof CommandError && error.code === ERROR_CODE.INPUT_TOO_LARGE) { return new AssetHttpError('TOO_LARGE'); }
  if (error instanceof CommandError || [
    'EACCES',
    'EPERM',
    'ELOOP',
  ].some((code) => hasErrorCode(error, code))) { return new AssetHttpError('ACCESS_DENIED'); }
  return new AssetHttpError('FAILED');
}
