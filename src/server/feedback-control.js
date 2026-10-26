import { readUtf8Markup } from '../markup/read-input.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { FEEDBACK_LIMITS } from '../feedback/constants.js';

export let FEEDBACK_CONTROL_ROUTES = Object.freeze([
  'GET /feedback',
  'POST /feedback/configure',
  'POST /feedback/disable',
  'POST /feedback/check',
]);

/**
 * @param {string} action
 * @param {import('node:http').IncomingMessage} request
 * @param {import('../../types/session.js').ControlActions} actions
 */
export async function handleFeedbackControl(action, request, actions) {
  if (action === 'GET /feedback') {
    if (!actions.feedbackStatus) { throw new CommandError('Feedback is unavailable in this worker.', ERROR_CODE.NOT_IMPLEMENTED, EXIT_CODE.RUNTIME_ERROR); }
    return actions.feedbackStatus();
  }
  let handlers = {
    'POST /feedback/configure': actions.feedbackConfigure,
    'POST /feedback/disable': actions.feedbackDisable,
    'POST /feedback/check': actions.feedbackCheck,
  };
  let handler = handlers[/** @type {keyof typeof handlers} */ (action)];
  if (!handler) { throw new CommandError('Feedback is unavailable in this worker.', ERROR_CODE.NOT_IMPLEMENTED, EXIT_CODE.RUNTIME_ERROR); }
  let source = await readUtf8Markup(request, FEEDBACK_LIMITS.bytes);
  let input;
  try { input = JSON.parse(source); }
  catch { throw new CommandError('Feedback input must be valid JSON.'); }
  return handler(input);
}
