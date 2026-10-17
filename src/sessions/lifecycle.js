import { SHUTDOWN_TIMEOUT_MS, SESSION_STATE } from './constants.js';
import { requestSession } from './client.js';
import { isProcessAlive, readSession, releaseSession } from './store.js';

/**
 * @param {string} sessionId
 */
export async function statusSession(sessionId) {
  let record = await readSession(sessionId);

  if (!record || !isProcessAlive(record.pid)) {
    return { sessionId, state: SESSION_STATE.STOPPED };
  }

  return requestSession(record, 'status');
}

/** @param {string} sessionId */
export async function stopSession(sessionId) {
  let record = await readSession(sessionId);

  if (!record) {
    return { sessionId, state: SESSION_STATE.STOPPED };
  }

  if (!isProcessAlive(record.pid)) {
    await releaseSession(record);
    return { sessionId, state: SESSION_STATE.STOPPED };
  }

  return requestSession(record, 'stop', SHUTDOWN_TIMEOUT_MS * 3);
}

/** @param {string} sessionId */
export async function readEvents(sessionId) {
  let record = await readSession(sessionId);
  if (!record || !isProcessAlive(record.pid)) {
    return { sessionId, state: SESSION_STATE.STOPPED, events: [], dropped: 0 };
  }
  return requestSession(record, 'events');
}
