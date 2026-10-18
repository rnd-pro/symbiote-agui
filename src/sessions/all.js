import { statusSession, stopSession } from './lifecycle.js';
import { ensureSessionStarted } from './start.js';
import { clearSession } from './clear.js';
import { listSessionIds } from './list.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { sharedSessionTunnel } from './tunnel.js';

/**
 * @param {import('../../types/cli.js').AllSessionsCommand} command
 * @returns {Promise<import('../../types/session.js').AllSessionsResult>}
 */
export async function runAllSessions(command) {
  let stop = { run: stopSession, code: ERROR_CODE.STOP_FAILED };
  let operations = {
    'tunnel renew all': { run: (/** @type {string} */ id) => sharedSessionTunnel(id, true), code: ERROR_CODE.TUNNEL_FAILED },
    'tunnel check all': { run: (/** @type {string} */ id) => sharedSessionTunnel(id, false), code: ERROR_CODE.TUNNEL_FAILED },
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
  let results = await Promise.all(ids.map(async (sessionId) => {
    try {
      let status = await operation.run(sessionId);
      if (!status) { return undefined; }
      if (command.startsWith('tunnel ') && status.tunnel?.active === false) {
        return { ok: false, ...status, error: { code: ERROR_CODE.TUNNEL_FAILED, message: status.tunnel.checkError || 'The tunnel is inactive.' } };
      }
      return { ok: true, ...status };
    }
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
  let sessions = /** @type {import('../../types/session.js').SessionOperationResult[]} */ (results.filter((session) => session !== undefined));
  let failed = sessions.filter((session) => !session.ok).length;
  let summary = { command, total: sessions.length, sessions };
  return failed
    ? { ...summary, ok: false, error: { code: operation.code, message: `${command} failed for ${failed} of ${sessions.length} sessions. See sessions for details.` } }
    : { ...summary, ok: true };
}
