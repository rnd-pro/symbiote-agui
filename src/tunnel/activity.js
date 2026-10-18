import { randomUUID } from 'node:crypto';
import { TUNNEL_CHECK_TIMEOUT_MS, TUNNEL_HEALTH_PATH } from './constants.js';
import { errorMessage } from '../shared/system-error.js';

/**
 * @param {import('../../types/session.js').SessionStatus} status
 * @returns {Promise<import('../../types/session.js').SessionStatus>}
 */
export async function checkTunnelActivity(status) {
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
      signal: AbortSignal.timeout(TUNNEL_CHECK_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Public tunnel returned HTTP ${response.status}.`);
    }
    let reply = await response.json();
    if (reply?.sessionId !== status.sessionId || reply?.nonce !== nonce) {
      throw new Error('The public URL did not reach this AGUI session.');
    }
    return { ...status, tunnel: { ...tunnel, active: true, checkedAt: new Date().toISOString() } };
  } catch (error) {
    return { ...status, tunnel: { ...tunnel, active: false, checkedAt: new Date().toISOString(), checkError: errorMessage(error) } };
  }
}
