import { CommandError } from '../../shared/command-error.js';
import { assertSessionId } from '../../sessions/identity.js';
import { validProjectId } from '../identity.js';
import { TRANSFER_OPERATIONS } from './constants.js';

/** @param {import('../../../types/manager.js').ManagerRequest} request */
export function validateTransferRequest(request) {
  let transfer = Object.hasOwn(TRANSFER_OPERATIONS, request.operation);
  let options = [
    request.destinationProjectId,
    request.destinationSessionId,
    request.includeData,
    request.includeMetadata,
  ];
  if (!transfer) {
    if (request.transferId !== undefined || options.some((value) => value !== undefined)) { throw new CommandError('Transfer options require a transfer operation.'); }
    return false;
  }
  if (request.all !== undefined || request.folder !== undefined || request.projectId !== undefined) { throw new CommandError('Transfer operations use the current scope and one explicit destination.'); }
  if (request.operation === 'transfer history' || request.operation === 'recover transfer') {
    if (request.sessionId !== undefined || options.some((value) => value !== undefined)) { throw new CommandError('Transfer history and recovery do not accept session options.'); }
    if (request.operation === 'transfer history' ? request.transferId !== undefined || request.confirm !== undefined
      : !/^[a-f0-9-]{36}$/.test(request.transferId || '') || request.confirm !== true) { throw new CommandError('Choose and confirm a transfer receipt for recovery.'); }
  } else {
    assertSessionId(request.sessionId || '');
    assertSessionId(request.destinationSessionId || '');
    if (request.operation === 'rename session') {
      if (request.destinationProjectId !== undefined || request.includeData !== undefined || request.includeMetadata !== undefined
        || request.transferId !== undefined || request.confirm !== true) { throw new CommandError('Rename requires one new session ID and confirmation, retaining all data in the current scope.'); }
      return true;
    }
    if (!validProjectId(request.destinationProjectId) || typeof request.includeData !== 'boolean'
      || typeof request.includeMetadata !== 'boolean' || request.confirm !== true || request.transferId !== undefined) {
      throw new CommandError('Choose a connected destination and explicitly confirm data and metadata inclusion.');
    }
  }
  return true;
}
