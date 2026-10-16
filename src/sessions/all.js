import { stopSession } from './lifecycle.js';
import { clearSession } from './clear.js';
import { listSessionIds } from './list.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';

/**
 * @param {import('../../types/cli.js').AllSessionsCommand} command
 * @returns {Promise<import('../../types/session.js').AllSessionsResult>}
 */
export async function runAllSessions(command) {
  let operations = {
    'stop-all': { run: stopSession, code: ERROR_CODE.STOP_FAILED },
    'clear-all': { run: clearSession, code: ERROR_CODE.CLEAR_FAILED },
  };
  let operation = operations[command];
  let ids;
  try { ids = await listSessionIds(command === 'clear-all'); }
  catch (error) {
    throw new CommandError(`Cannot list sessions: ${errorMessage(error)}`, operation.code, EXIT_CODE.RUNTIME_ERROR);
  }
  /** @type {import('../../types/session.js').SessionOperationResult[]} */
  let sessions = await Promise.all(ids.map(async (sessionId) => {
    try { return { ok: true, ...await operation.run(sessionId) }; }
    catch (error) {
      return {
        ok: false,
        sessionId,
        error: {
          code: error instanceof CommandError ? error.code : operation.code,
          message: errorMessage(error),
        },
      };
    }
  }));
  let failed = sessions.filter((session) => !session.ok).length;
  let summary = { command, total: sessions.length, sessions };
  return failed
    ? { ...summary, ok: false, error: { code: operation.code, message: `${command} failed for ${failed} of ${sessions.length} sessions. See sessions for details.` } }
    : { ...summary, ok: true };
}
