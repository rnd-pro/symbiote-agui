import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { TUNNEL_CHECK_TIMEOUT_MS, TUNNEL_HEALTH_PATH, TUNNEL_READY_TIMEOUT_MS, TUNNEL_READY_RETRY_MS } from './constants.js';
import { errorMessage } from '../shared/system-error.js';

/**
 * @param {import('../../types/session.js').SessionStatus} status
 * @param {number} [timeoutMs]
 * @returns {Promise<import('../../types/session.js').SessionStatus>}
 */
export async function checkTunnelActivity(status, timeoutMs = TUNNEL_CHECK_TIMEOUT_MS) {
  let tunnel = status.tunnel || { state: 'stopped' };
  if (!status.publicUrl || tunnel.state !== 'ready') {
    return { ...status, tunnel: { ...tunnel, active: false } };
  }
  let nonce = randomUUID();
  let url = new URL(TUNNEL_HEALTH_PATH, status.publicUrl);
  url.searchParams.set('nonce', nonce);
  try {
    let response = await fetch(url, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Public tunnel returned HTTP ${response.status}.`);
    }
    let reply = await response.json();
    if (reply?.sessionId !== status.sessionId || reply?.nonce !== nonce) {
      throw new Error('The public URL did not reach this AGUI session.');
    }
    return {
      ...status,
      tunnel: {
        ...tunnel,
        active: true,
        checkedAt: new Date().toISOString(),
        checkError: undefined,
      },
    };
  } catch (error) {
    let detail = errorMessage(error);
    if (error instanceof Error && error.cause instanceof Error) { detail += `: ${errorMessage(error.cause)}`; }
    return { ...status, tunnel: { ...tunnel, active: false, checkedAt: new Date().toISOString(), checkError: detail } };
  }
}

/**
 * Wait for DNS and routing on this exact URL; never recreate a connector here.
 * @param {import('../../types/session.js').SessionStatus} status
 * @param {number} [timeoutMs]
 * @returns {Promise<import('../../types/session.js').SessionStatus>}
 */
export async function waitForTunnelActivity(status, timeoutMs = TUNNEL_READY_TIMEOUT_MS) {
  let deadline = Date.now() + timeoutMs;
  do {
    let remaining = Math.max(1, deadline - Date.now());
    status = await checkTunnelActivity(status, Math.min(TUNNEL_CHECK_TIMEOUT_MS, remaining));
    if (status.tunnel?.active || status.tunnel?.state !== 'ready' || !status.publicUrl) { return status; }
    remaining = deadline - Date.now();
    if (remaining <= 0) { break; }
    await delay(Math.min(TUNNEL_READY_RETRY_MS, remaining));
  } while (Date.now() < deadline);
  return status;
}
