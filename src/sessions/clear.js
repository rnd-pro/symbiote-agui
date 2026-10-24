import { INSERT_TIMEOUT_MS } from '../markup/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';
import { clearCachedMarkup } from './cache.js';
import { requestSession } from './client.js';
import { SESSION_STATE } from './constants.js';
import { isProcessAlive, readSession, releaseSession, reserveSession } from './store.js';
import { withSessionLock } from './storage-lock.js';

/**
 * @param {string} sessionId
 * @returns {Promise<import('../../types/session.js').SessionStatus>}
 */
export async function clearSession(sessionId) {
  let record = await readSession(sessionId);
  if (record && isProcessAlive(record.pid)) {
    return requestSession(record, 'clear', INSERT_TIMEOUT_MS);
  }
  return withSessionLock(sessionId, () => clearStopped(sessionId));
}

/** @param {string} sessionId */
async function clearStopped(sessionId) {
  let record = await readSession(sessionId);
  if (record && isProcessAlive(record.pid)) { throw new CommandError('The session started while clearing. Check status before retrying.'); }
  if (record) { await releaseSession(record); }
  let reservation;
  try {
    reservation = await reserveSession(sessionId);
  } catch (error) {
    if (['EEXIST', 'ENOTEMPTY', 'EPERM'].some((code) => hasErrorCode(error, code))) {
      throw new CommandError('The session changed while clearing. Check its status before retrying.', ERROR_CODE.SESSION_EXISTS, EXIT_CODE.RUNTIME_ERROR);
    }
    throw error;
  }
  try {
    await clearCachedMarkup(sessionId);
    return { sessionId, state: SESSION_STATE.STOPPED, cleared: true };
  } finally {
    await releaseSession(reservation);
  }
}
