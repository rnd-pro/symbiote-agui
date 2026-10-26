import { getSettings } from '../config/settings.js';
import { rememberProject } from '../projects/registry.js';
import { transferSession } from '../projects/transfer/service.js';
import { assertSessionId } from './identity.js';
import { SESSION_STATE } from './constants.js';
import { ERROR_CODE } from '../shared/constants.js';
import { CommandError } from '../shared/command-error.js';

/**
 * @param {string} sessionId
 * @param {string} destinationSessionId
 * @param {Parameters<typeof transferSession>[2]} [hooks]
 * @returns {Promise<import('../../types/session.js').SessionRenameResult>}
 */
export async function renameSession(sessionId, destinationSessionId, hooks) {
  assertSessionId(sessionId);
  assertSessionId(destinationSessionId);
  if (destinationSessionId === 'all') { throw new CommandError('The ID all is reserved for bulk session controls. Choose another ID.'); }
  let project = await rememberProject(getSettings().folder);
  let result = await transferSession(project.id, {
    kind: 'move',
    sessionId,
    destinationProjectId: project.id,
    destinationSessionId,
    includeData: true,
    includeMetadata: true,
  }, hooks);
  let status = {
    sessionId: result.ok ? destinationSessionId : sessionId,
    previousSessionId: sessionId,
    active: false,
    state: SESSION_STATE.STOPPED,
    renamed: result.ok,
    transfer: result.transfer,
  };
  return result.ok ? {
    ...status,
    ok: true,
  } : {
    ...status,
    ok: false,
    error: result.error || {
      code: ERROR_CODE.CACHE_ERROR,
      message: 'Rename did not complete. Review its transfer receipt before retrying.',
    },
  };
}
