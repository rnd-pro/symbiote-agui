import { MANAGER_FEEDBACK_OPERATIONS } from './constants.js';
import { CommandError } from '../shared/command-error.js';
import { assertSessionId } from '../sessions/identity.js';
import { readSession, isProcessAlive } from '../sessions/store.js';
import { requestSession } from '../sessions/client.js';
import { text, object } from '../feedback/validate-shape.js';
import { FEEDBACK_LIMITS } from '../feedback/constants.js';

/** @param {import('../../types/manager.js').ManagerRequest} request */
export function validateManagerFeedback(request) {
  let fields = [
    'instanceId',
    'conversationId',
    'command',
  ];
  if (!Object.hasOwn(MANAGER_FEEDBACK_OPERATIONS, request.operation)) {
    if (fields.some((key) => Object.hasOwn(request, key))) { throw new CommandError('Feedback fields require a feedback operation.'); }
    return false;
  }
  let write = request.operation !== 'feedback settings';
  let configure = request.operation === 'feedback configure';
  let allowed = [
    'id',
    'operation',
    'sessionId',
    ...(write ? [
      'instanceId',
    ] : []),
    ...(configure ? [
      'conversationId',
      'command',
    ] : []),
  ];
  if (Object.keys(request).some((key) => !allowed.includes(key)) || typeof request.sessionId !== 'string') {
    throw new CommandError('Feedback settings require one running session.');
  }
  assertSessionId(request.sessionId);
  if (write) { text(request.instanceId); }
  if (configure) {
    text(request.conversationId);
    object(request.command);
    if (Buffer.byteLength(JSON.stringify(request)) > FEEDBACK_LIMITS.bytes) { throw new CommandError('Feedback configuration exceeds 16 KiB.'); }
  }
  return true;
}

/**
 * @param {import('../../types/manager.js').ManagerRequest} request
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function runManagerFeedback(request) {
  let record = await readSession(request.sessionId || '');
  if (!record || !isProcessAlive(record.pid)) { throw new CommandError('Start this session before configuring feedback.'); }
  if (request.instanceId !== undefined && request.instanceId !== record.instanceId) {
    throw new CommandError('The session restarted. Reopen Feedback command before changing its settings.');
  }
  let operation = MANAGER_FEEDBACK_OPERATIONS[/** @type {keyof typeof MANAGER_FEEDBACK_OPERATIONS} */ (request.operation)];
  let identity = {
    sessionId: record.sessionId,
    instanceId: record.instanceId,
  };
  let result = await requestSession(record, 'feedback/settings');
  if (!result.feedbackSettings) { throw new CommandError('Restart this session to manage its feedback command.'); }
  if (request.operation !== 'feedback settings') {
    let input = request.operation === 'feedback configure' ? {
      ...identity,
      conversationId: request.conversationId,
      command: request.command,
    } : identity;
    await requestSession(record, /** @type {'feedback/configure' | 'feedback/disable'} */ (operation.action), undefined, JSON.stringify(input));
    result = await requestSession(record, 'feedback/settings');
  }
  if (!result.feedbackSettings) { throw new CommandError('Restart this session to manage its feedback command.'); }
  return {
    ok: true,
    feedbackSettings: result.feedbackSettings,
  };
}
