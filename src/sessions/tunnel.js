import { requestSession } from './client.js';
import { readSession, isProcessAlive } from './store.js';
import { statusSession } from './lifecycle.js';
import { checkTunnelActivity } from '../tunnel/activity.js';
import { TUNNEL_REQUEST_TIMEOUT_MS } from '../tunnel/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';

/** @param {string} sessionId */
export async function renewSessionTunnel(sessionId) {
  let record = await readSession(sessionId);
  if (!record || !isProcessAlive(record.pid)) {
    throw new CommandError(`Start session ${sessionId} before renewing its tunnel.`, ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
  }
  let status = await requestSession(record, 'tunnel-renew', TUNNEL_REQUEST_TIMEOUT_MS);
  return checkTunnelActivity({ ...status, pid: record.pid, active: true });
}

/** @param {string} sessionId */
export async function checkSessionTunnel(sessionId) {
  let status = await statusSession(sessionId, false);
  return checkTunnelActivity(status);
}

/**
 * @param {string} sessionId
 * @param {boolean} renew
 */
export async function sharedSessionTunnel(sessionId, renew) {
  let status = await statusSession(sessionId, false);
  if (!status.active || !status.tunnel) { return undefined; }
  return renew ? renewSessionTunnel(sessionId) : checkTunnelActivity(status);
}
