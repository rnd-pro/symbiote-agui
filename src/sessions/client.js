import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { CONTROL_TIMEOUT_MS, SESSION_STATE } from './constants.js';

/**
 * @param {import('../../types/session.js').SessionRecord} record
 * @param {'status' | 'stop'} action
 * @param {number} timeout
 * @returns {Promise<import('../../types/session.js').SessionStatus>}
 */
export async function requestSession(record, action, timeout = CONTROL_TIMEOUT_MS) {
  try {
    if (!record.controlUrl) {
      throw new Error('The worker is still starting.');
    }

    let response = await fetch(`${record.controlUrl}/${action}`, {
      method: action === 'stop' ? 'POST' : 'GET',
      headers: { authorization: `Bearer ${record.controlToken}` },
      signal: AbortSignal.timeout(timeout),
      redirect: 'error',
    });
    let reply = /** @type {import('../../types/session.js').ControlReply} */ (await response.json());

    if (!response.ok || reply.instanceId !== record.instanceId || reply.pid !== record.pid || reply.result?.sessionId !== record.sessionId || !Object.values(SESSION_STATE).includes(reply.result.state)) {
      throw new Error('Worker identity or response did not match the session.');
    }

    return reply.result;
  } catch {
    throw new CommandError(`Session ${record.sessionId} is starting or unreachable. Inspect its worker.log before retrying.`, ERROR_CODE.SESSION_UNREACHABLE, EXIT_CODE.RUNTIME_ERROR);
  }
}
