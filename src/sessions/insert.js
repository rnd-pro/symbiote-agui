import { INSERT_TIMEOUT_MS } from '../markup/constants.js';
import { readMarkup } from '../markup/read-input.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { requestSession } from './client.js';
import { isProcessAlive, readSession } from './store.js';

/**
 * @param {string} sessionId
 * @param {string | undefined} file
 */
export async function insertMarkup(sessionId, file) {
  return sendInput(sessionId, file, 'insert');
}

/**
 * @param {string} sessionId
 * @param {string | undefined} file
 */
export async function updateState(sessionId, file) {
  return sendInput(sessionId, file, 'update');
}

/**
 * @param {string} sessionId
 * @param {string | undefined} file
 * @param {'insert' | 'update'} action
 */
async function sendInput(sessionId, file, action) {
  let record = await readSession(sessionId);

  if (!record || !isProcessAlive(record.pid)) {
    throw new CommandError(`Session ${sessionId} is stopped. Start it before inserting markup.`, ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
  }

  let html = await readMarkup(file);
  return requestSession(record, action, INSERT_TIMEOUT_MS, html);
}
