import { requestSession } from '../sessions/client.js';
import { readSession, isProcessAlive } from '../sessions/store.js';
import { assertSessionId } from '../sessions/identity.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { TOOL_OPERATION_TIMEOUT_MS } from '../transport/constants.js';
import { validateToolRequest } from './request.js';

/**
 * @param {string} sessionId
 * @param {unknown} input
 * @returns {Promise<import('../../types/tools.js').SessionToolResponse>}
 */
export async function requestTools(sessionId, input) {
  assertSessionId(sessionId);
  let request = validateToolRequest(input);
  let record = await readSession(sessionId);
  if (!record || !isProcessAlive(record.pid)) {
    throw new CommandError(`Start the session with npx symbiote-agui start ${sessionId}.`, ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
  }
  let response;
  try {
    response = await requestSession(record, 'tools', TOOL_OPERATION_TIMEOUT_MS + 5_000, JSON.stringify(request));
  } catch (error) {
    if (request.action === 'call' && error instanceof CommandError && error.code === ERROR_CODE.SESSION_UNREACHABLE) {
      throw new CommandError(`${error.message} The call outcome may be unknown; do not retry automatically.`, error.code, error.exitCode);
    }
    throw error;
  }
  if (!response.toolResponse) {
    throw new CommandError('The worker does not support tool requests. Stop and restart this session.', ERROR_CODE.TOOL_FAILED, EXIT_CODE.RUNTIME_ERROR);
  }
  return { sessionId, ...response.toolResponse };
}

/** @param {unknown} result */
export function isToolError(result) {
  return !!result && typeof result === 'object' && 'isError' in result && result.isError === true;
}
