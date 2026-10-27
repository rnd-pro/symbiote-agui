import { readUtf8Markup } from '../markup/read-input.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';

export let CONNECTION_CONTROL_ROUTES = [
  'GET /connections',
  'POST /connections/disconnect',
  'POST /tunnel-stop',
];

/**
 * @param {string} action
 * @param {import('node:http').IncomingMessage} request
 * @param {import('../../types/session.js').ControlActions} actions
 */
export async function handleConnectionsControl(action, request, actions) {
  if (action === 'GET /connections' && actions.connections) { return actions.connections(); }
  if (action === 'POST /tunnel-stop' && actions.tunnelStop) { return actions.tunnelStop(); }
  if (action === 'POST /connections/disconnect' && actions.disconnectPage) {
    let input;
    try { input = JSON.parse(await readUtf8Markup(request, 1024)); }
    catch { throw new CommandError('Expected a browser connection identity.'); }
    return actions.disconnectPage(input);
  }
  throw new CommandError('Connection management is unavailable in this worker. Save browser drafts before restarting it.', ERROR_CODE.NOT_IMPLEMENTED);
}
