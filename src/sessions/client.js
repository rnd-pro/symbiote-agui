import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { CONTROL_TIMEOUT_MS, SESSION_STATE } from './constants.js';

/**
 * @param {import('../../types/session.js').SessionRecord} record
 * @param {'status' | 'stop' | 'insert' | 'update' | 'events' | 'tools' | 'clear' | 'share' | 'tunnel-renew' | 'tunnel-stop' | 'connections' | 'connections/disconnect' | 'sync' | 'transfer-snapshot' | 'feedback' | 'feedback/settings' | 'feedback/configure' | 'feedback/disable' | 'feedback/check' | 'proxy' | 'proxy/change'} action
 * @param {number} timeout
 * @param {string} [html]
 * @returns {Promise<import('../../types/session.js').SessionStatus>}
 */
export async function requestSession(record, action, timeout = CONTROL_TIMEOUT_MS, html) {
  try {
    if (!record.controlUrl) {
      throw new Error('The worker is still starting.');
    }

    let response = await fetch(`${record.controlUrl}/${action}`, {
      method: ['status', 'events', 'feedback', 'feedback/settings', 'connections', 'proxy'].includes(action) ? 'GET' : 'POST',
      headers: {
        authorization: `Bearer ${record.controlToken}`,
        ...(action === 'insert' ? { 'content-type': 'text/html; charset=utf-8' } : {}),
        ...(['update', 'tools', 'sync', 'connections/disconnect'].includes(action) || action.startsWith('feedback/') || action.startsWith('proxy/') ? { 'content-type': 'application/json' } : {}),
      },
      body: html,
      signal: AbortSignal.timeout(timeout),
      redirect: 'error',
    });
    if (['connections', 'connections/disconnect', 'tunnel-stop'].includes(action) && response.status === 404) {
      throw new CommandError('Connection management is unavailable in this worker. Save browser drafts before restarting it.', ERROR_CODE.NOT_IMPLEMENTED);
    }
    if (action.startsWith('proxy') && response.status === 404) {
      throw new CommandError('Proxy policy control is unavailable in this worker. Preserve drafts before restarting it.', ERROR_CODE.NOT_IMPLEMENTED);
    }
    if (action.startsWith('feedback') && response.status === 404) {
      throw new CommandError('Feedback is unavailable in this worker.', ERROR_CODE.NOT_IMPLEMENTED, EXIT_CODE.RUNTIME_ERROR);
    }
    if (action === 'tunnel-renew' && response.status === 404) {
      throw new CommandError('Tunnel renewal is unavailable in this worker. Stop and restart the session.', ERROR_CODE.TUNNEL_FAILED, EXIT_CODE.RUNTIME_ERROR);
    }
    if (action === 'sync' && response.status === 404) {
      throw new CommandError('Sync is unavailable in this worker. Stop and restart the session.', ERROR_CODE.UPDATE_FAILED, EXIT_CODE.RUNTIME_ERROR);
    }
    if (action === 'transfer-snapshot' && response.status === 404) {
      throw new CommandError('Transfer snapshots are unavailable in this worker. Stop and restart the session before copying.', ERROR_CODE.NOT_IMPLEMENTED, EXIT_CODE.RUNTIME_ERROR);
    }
    let reply = /** @type {import('../../types/session.js').ControlReply} */ (await response.json());

    if (reply.instanceId !== record.instanceId || reply.pid !== record.pid) {
      throw new Error('Worker identity or response did not match the session.');
    }

    if ('error' in reply && Object.values(ERROR_CODE).includes(reply.error.code)) {
      throw new CommandError(reply.error.message, reply.error.code, reply.exitCode === EXIT_CODE.INVALID_INPUT ? EXIT_CODE.INVALID_INPUT : EXIT_CODE.RUNTIME_ERROR);
    }

    if (!response.ok || !('result' in reply) || reply.result.sessionId !== record.sessionId || !Object.values(SESSION_STATE).includes(reply.result.state)) {
      throw new Error('Invalid worker result.');
    }

    return reply.result;
  } catch (error) {
    if (error instanceof CommandError) {
      throw error;
    }
    throw new CommandError(`Session ${record.sessionId} is starting or unreachable. Inspect its worker.log before retrying.`, ERROR_CODE.SESSION_UNREACHABLE, EXIT_CODE.RUNTIME_ERROR);
  }
}
