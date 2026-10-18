import { statusSession, stopSession } from './lifecycle.js';
import { ensureSessionStarted } from './start.js';
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
  let stop = { run: stopSession, code: ERROR_CODE.STOP_FAILED };
  let operations = {
    'start all': { run: ensureSessionStarted, code: ERROR_CODE.START_FAILED },
    'status all': { run: statusSession, code: ERROR_CODE.SESSION_UNREACHABLE },
    'stop all': stop,
    'stop-all': stop,
    'clear-all': { run: clearSession, code: ERROR_CODE.CLEAR_FAILED },
  };
  let operation = operations[command];
  let ids;
  try { ids = await listSessionIds(['clear-all', 'start all', 'status all'].includes(command)); }
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
        ...(command === 'status all' ? { active: null } : {}),
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
