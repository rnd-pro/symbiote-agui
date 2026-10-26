import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { assertSessionId } from '../sessions/identity.js';
import { readSession, isProcessAlive } from '../sessions/store.js';
import { requestSession } from '../sessions/client.js';
import { readMarkup } from '../markup/read-input.js';
import { FEEDBACK_LIMITS } from '../feedback/constants.js';
import { CONTROL_TIMEOUT_MS } from '../sessions/constants.js';
import { FEEDBACK_COMMANDS } from './commands.js';
import { text } from '../feedback/validate-shape.js';

/**
 * @param {string[]} positionals
 * @param {Record<string, string | boolean | undefined>} values
 * @returns {import('../../types/cli.js').FeedbackCliRequest | undefined}
 */
export function parseFeedbackCommand(positionals, values) {
  if (positionals[0] !== 'feedback') { return; }
  let command = positionals[1];
  let sessionId = positionals[2];
  let definition = FEEDBACK_COMMANDS[/** @type {keyof typeof FEEDBACK_COMMANDS} */ (command)];
  if (!Object.hasOwn(FEEDBACK_COMMANDS, command) || positionals.length !== 3 || !sessionId
    || Object.entries(values).some(([
      key,
      value,
    ]) => !(/** @type {readonly string[]} */ (definition.options)).includes(key) || value === '')) {
    throw new CommandError(`Usage: symbiote-agui ${Object.values(FEEDBACK_COMMANDS).map((entry) => entry.usage).join(' | ')}`);
  }
  assertSessionId(sessionId);
  if (command === 'check') {
    text(values.conversation);
    return {
      kind: 'feedback',
      command,
      sessionId,
      conversationId: values.conversation,
    };
  }
  return command === 'configure' ? { kind: 'feedback', command, sessionId, file: /** @type {string | undefined} */ (values.file) }
    : { kind: 'feedback', command: /** @type {'status' | 'disable'} */ (command), sessionId };
}

/** @param {import('../../types/cli.js').FeedbackCliRequest} request */
export async function runFeedbackCommand(request) {
  let record = await readSession(request.sessionId);
  if (!record || !isProcessAlive(record.pid)) {
    throw new CommandError('Feedback requires a running session.', ERROR_CODE.SESSION_STOPPED, EXIT_CODE.RUNTIME_ERROR);
  }
  let body;
  if (request.command === 'configure') {
    try { body = await readMarkup(request.file, process.stdin, FEEDBACK_LIMITS.bytes); }
    catch { throw new CommandError('Could not read private feedback configuration.'); }
    try { JSON.parse(body); }
    catch { throw new CommandError('Feedback configuration must be valid JSON.'); }
  } else if (request.command === 'disable') {
    body = JSON.stringify({ sessionId: record.sessionId, instanceId: record.instanceId });
  } else if (request.command === 'check') {
    text(request.conversationId);
    body = JSON.stringify({
      sessionId: record.sessionId,
      instanceId: record.instanceId,
      conversationId: request.conversationId,
    });
  }
  let action = /** @type {const} */ ({
    configure: 'feedback/configure',
    status: 'feedback',
    disable: 'feedback/disable',
    check: 'feedback/check',
  });
  return requestSession(record, action[request.command], CONTROL_TIMEOUT_MS, body);
}
