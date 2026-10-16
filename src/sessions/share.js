import { requestSession } from './client.js';
import { readSession, isProcessAlive } from './store.js';
import { withAuthorizationUrl } from './page-url.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { TUNNEL_REQUEST_TIMEOUT_MS } from '../tunnel/constants.js';

/** @param {string} sessionId */
export async function shareSession(sessionId) {
  let record = await readSession(sessionId);
  if (!record || !isProcessAlive(record.pid)) {
    throw new CommandError(`Start session ${sessionId} before sharing it.`, ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
  }
  return withAuthorizationUrl(await requestSession(record, 'share', TUNNEL_REQUEST_TIMEOUT_MS), record.pageToken);
}
