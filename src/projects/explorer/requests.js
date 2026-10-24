import { CommandError } from '../../shared/command-error.js';
import { EXPLORER_DIRECTORY_LIMIT, EXPLORER_OPERATIONS } from './constants.js';
import { validExplorerPath } from './access.js';

/** @param {import('../../../types/manager.js').ManagerRequest} request */
export function validateExplorerRequest(request) {
  if (!Object.hasOwn(EXPLORER_OPERATIONS, request.operation)) {
    if (request.path !== undefined || request.offset !== undefined || request.showHidden !== undefined) {
      throw new CommandError('File paths and browsing options are only accepted by project explorer operations.');
    }
    return;
  }
  if (!validExplorerPath(request.path === undefined ? '' : request.path) || request.showHidden !== undefined && typeof request.showHidden !== 'boolean'
    || request.operation === 'project preview' && (!request.path || request.offset !== undefined)
    || request.offset !== undefined && (!Number.isSafeInteger(request.offset) || request.offset < 0 || request.offset > EXPLORER_DIRECTORY_LIMIT)) {
    throw new CommandError('Choose a project-relative path and a valid explorer page.');
  }
}
