import { readUtf8Markup } from '../markup/read-input.js';
import { CONNECTOR_LIMITS } from '../connectors/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';

export const CONNECTOR_CONTROL_ROUTES = [
  'POST /connector/control',
  'POST /connector/call',
  'POST /connector/receipt',
];

/**
 * @param {string} action
 * @param {import('node:http').IncomingMessage} request
 * @param {import('../../types/session.js').ControlActions} actions
 */
export async function handleConnectorControl(action, request, actions) {
  let handlers = {
    'POST /connector/control': actions.connectorControl,
    'POST /connector/call': actions.connectorCall,
    'POST /connector/receipt': actions.connectorReceipt,
  };
  let handler = handlers[/** @type {keyof typeof handlers} */ (action)];
  if (!handler) { throw new CommandError('Connector control is unavailable in this worker. Preserve drafts before restarting.', ERROR_CODE.NOT_IMPLEMENTED); }
  let input;
  try { input = JSON.parse(await readUtf8Markup(request, CONNECTOR_LIMITS.messageBytes)); }
  catch { throw new CommandError('Connector control expects bounded JSON input.'); }
  return handler(input);
}
