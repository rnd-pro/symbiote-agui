import { requestSession } from '../sessions/client.js';
import { readSession, isProcessAlive } from '../sessions/store.js';
import { assertSessionId } from '../sessions/identity.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { TOOL_OPERATION_TIMEOUT_MS } from '../transport/constants.js';

/**
 * @param {keyof typeof import('./catalog.js').MCP_TOOLS} name
 * @param {import('../../types/tools.js').McpToolArguments} args
 */
export async function forwardToolRequest(name, args) {
  assertSessionId(args.sessionId);
  let record = await readSession(args.sessionId);
  if (!record || !isProcessAlive(record.pid)) {
    throw new CommandError('Start the session with npx symbiote-agui start SESSION_ID.', ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
  }
  let operations = { list_pages: 'pages', list_tools: 'tools', call_tool: 'call' };
  let request = {
    action: operations[name], pageId: args.pageId, discoveryId: args.discoveryId, name: args.name, input: args.input,
  };
  let response;
  try {
    response = await requestSession(record, 'tools', TOOL_OPERATION_TIMEOUT_MS + 5_000, JSON.stringify(request));
  } catch (error) {
    if (name === 'call_tool' && error instanceof CommandError && error.code === ERROR_CODE.SESSION_UNREACHABLE) {
      throw new CommandError(`${error.message} The call outcome may be unknown; do not retry automatically.`, error.code, error.exitCode);
    }
    throw error;
  }
  if (!response.toolResponse) { throw new Error('The worker does not support MCP tool requests. Restart this session.'); }
  return { sessionId: args.sessionId, ...response.toolResponse };
}
