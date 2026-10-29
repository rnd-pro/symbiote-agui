import { readUtf8Markup } from '../markup/read-input.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';
import { PROXY_LIMITS } from '../proxy/constants.js';

export const PROXY_CONTROL_ROUTES = [
  'GET /proxy',
  'POST /proxy/change',
];

/**
 * @param {string} action
 * @param {import('node:http').IncomingMessage} request
 * @param {import('../../types/session.js').ControlActions} actions
 */
export async function handleProxyControl(action, request, actions) {
  if (action === 'GET /proxy' && actions.proxyStatus) { return actions.proxyStatus(); }
  if (action === 'POST /proxy/change' && actions.proxyChange) {
    let source = await readUtf8Markup(request, PROXY_LIMITS.policyBytes);
    let input;
    try { input = JSON.parse(source); }
    catch { throw new CommandError('Proxy changes must be valid JSON.'); }
    return actions.proxyChange(input);
  }
  throw new CommandError('Proxy policy control is unavailable in this worker. Preserve drafts before restarting it.', ERROR_CODE.NOT_IMPLEMENTED);
}
