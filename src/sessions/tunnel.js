import { requestSession } from './client.js';
import { readSession, isProcessAlive } from './store.js';
import { statusSession } from './lifecycle.js';
import { checkTunnelActivity, waitForTunnelActivity } from '../tunnel/activity.js';
import { TUNNEL_REQUEST_TIMEOUT_MS, TUNNEL_READY_TIMEOUT_MS } from '../tunnel/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';

/**
 * @param {import('../../types/session.js').SessionRecord} record
 * @param {boolean} [viewer]
 */
export async function openSessionPublicLink(record, viewer = false) {
  let status = await requestSession(record, 'status');
  if (!status.tunnel) { throw new CommandError('Attach a public tunnel before opening its link.'); }
  let fresh = freshTunnelWait(status);
  status = fresh ? await waitForTunnelActivity(status, fresh) : await checkTunnelActivity(status);
  if (status.tunnel?.active !== true && !fresh) {
    // Another CLI or manager can have renewed the URL while its old check ran.
    let latest = await requestSession(record, 'status');
    if (!latest.tunnel) { throw new CommandError('The public tunnel was stopped while checking it.'); }
    if (latest.publicUrl !== status.publicUrl || latest.tunnel.readyAt !== status.tunnel?.readyAt) {
      fresh = freshTunnelWait(latest);
      status = fresh ? await waitForTunnelActivity(latest, fresh) : await checkTunnelActivity(latest);
    }
  }
  if (status.tunnel?.active !== true && !fresh) {
    status = await requestSession(record, 'tunnel-renew', TUNNEL_REQUEST_TIMEOUT_MS);
    status = await waitForTunnelActivity(status);
  }
  if (!status.publicUrl || status.tunnel?.active !== true) {
    let detail = status.tunnel?.checkError || status.tunnel?.error || 'The public tunnel is unavailable.';
    throw new CommandError(`${detail} The current tunnel has been kept; retry opening its link.`, ERROR_CODE.TUNNEL_FAILED, EXIT_CODE.RUNTIME_ERROR);
  }
  let url = new URL(status.publicUrl);
  url.searchParams.delete('mode');
  if (viewer) { url.searchParams.set('mode', 'viewer'); }
  return {
    status,
    url: url.href,
  };
}

/** @param {import('../../types/session.js').SessionStatus} status */
function freshTunnelWait(status) {
  let readyAt = Date.parse(status.tunnel?.readyAt || '');
  return Number.isFinite(readyAt) ? Math.max(0, Math.min(TUNNEL_READY_TIMEOUT_MS, readyAt + TUNNEL_READY_TIMEOUT_MS - Date.now())) : 0;
}

/** @param {string} sessionId */
export async function renewSessionTunnel(sessionId) {
  let record = await readSession(sessionId);
  if (!record || !isProcessAlive(record.pid)) {
    throw new CommandError(`Start session ${sessionId} before renewing its tunnel.`, ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
  }
  let status = await requestSession(record, 'tunnel-renew', TUNNEL_REQUEST_TIMEOUT_MS);
  return waitForTunnelActivity({ ...status, pid: record.pid, active: true });
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
