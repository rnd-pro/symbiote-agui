import { projectId } from '../projects/identity.js';
import { transferSession } from '../projects/transfer/service.js';
import { transferHistory } from '../projects/transfer/receipts.js';
import { recoverTransfer } from '../projects/transfer/recover.js';
import { stateRootForFolder } from '../sessions/store.js';
import { CommandError } from '../shared/command-error.js';

/**
 * @param {import('../../types/manager.js').ManagerRequest} request
 * @param {import('../../types/manager.js').ManagerScope} scope
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function runManagerTransfer(request, scope) {
  if (request.operation === 'transfer history') {
    return {
      ok: true,
      transfers: await transferHistory(scope.stateRoot),
    };
  }
  if (request.operation === 'recover transfer') { return recoverTransfer(request.transferId || '', scope.stateRoot); }
  if (scope.stateRoot !== stateRootForFolder(scope.settings.folder)) { throw new CommandError('Reopen this manager in its registered project scope before transferring sessions.'); }
  return transferSession(projectId(scope.settings.folder), {
    kind: request.operation === 'move session' ? 'move' : 'copy',
    sessionId: request.sessionId || '',
    destinationProjectId: request.destinationProjectId || '',
    destinationSessionId: request.destinationSessionId || '',
    includeData: request.includeData === true,
    includeMetadata: request.includeMetadata === true,
  });
}
