import { assertSessionId } from '../sessions/identity.js';
import { CommandError } from '../shared/command-error.js';
import { PROXY_COMMANDS } from './commands.js';
import { normalizeProxyOrigin } from '../proxy/policy.js';

/**
 * @param {string[]} positionals
 * @param {Record<string, string | boolean | undefined>} values
 * @returns {import('../../types/proxy.js').ProxyCliRequest | undefined}
 */
export function parseProxyCommand(positionals, values) {
  if (positionals[0] !== 'proxy') { return; }
  let command = positionals[1];
  let sessionId = positionals[2];
  if (!Object.hasOwn(PROXY_COMMANDS, command || '') || !sessionId
    || positionals.length !== (command === 'status' ? 3 : 4) || Object.keys(values).length) {
    throw new CommandError('Usage: symbiote-agui proxy allow <SESSION_ID> <ORIGIN> | proxy remove <SESSION_ID> <ORIGIN> | proxy status <SESSION_ID>');
  }
  assertSessionId(sessionId);
  if (command === 'status') { return {
    kind: 'proxy',
    command,
    sessionId,
  }; }
  return {
    kind: 'proxy',
    command: /** @type {'allow' | 'remove'} */ (command),
    sessionId,
    origin: normalizeProxyOrigin(positionals[3]),
  };
}
