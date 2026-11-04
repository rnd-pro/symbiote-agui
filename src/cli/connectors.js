import { assertSessionId } from '../sessions/identity.js';
import { CONNECTOR_ACTION } from '../connectors/constants.js';
import { CommandError } from '../shared/command-error.js';

export const CONNECTOR_COMMANDS = Object.freeze({
  expose: {
    usage: 'connector expose <SESSION_ID> <ACTION> --file <POLICY_JSON>',
    options: [
      'file',
    ],
  },
  unexpose: {
    usage: 'connector unexpose <SESSION_ID> <ACTION>',
    options: [],
  },
  attach: {
    usage: 'connector attach <SESSION_ID> <ACTION> --registry <NAME|PATH> --script <ADDRESS>',
    options: [
      'registry',
      'script',
    ],
  },
  update: {
    usage: 'connector update <SESSION_ID> <ACTION> [--registry <NAME|PATH>]',
    options: [
      'registry',
    ],
  },
  grant: {
    usage: 'connector grant <SESSION_ID> <ACTION> --revision <DIGEST> --source agent|agui [--profile <NAME>] [--timeout <MS>] [--result-bytes <BYTES>]',
    options: [
      'revision',
      'source',
      'profile',
      'timeout',
      'result-bytes',
    ],
  },
  call: {
    usage: 'connector call <SESSION_ID> <ACTION> [--file <JSON_PATH>]',
    options: [
      'file',
    ],
  },
  receipt: {
    usage: 'connector receipt <SESSION_ID> <ACTION> --request <UUID>',
    options: [
      'request',
    ],
  },
  status: {
    usage: 'connector status <SESSION_ID>',
    options: [],
  },
  list: {
    usage: 'connector list <SESSION_ID>',
    options: [],
  },
  review: {
    usage: 'connector review <SESSION_ID> <ACTION> [--path <BUNDLE_FILE>]',
    options: [
      'path',
    ],
  },
  describe: {
    usage: 'connector describe <SESSION_ID> <ACTION>',
    options: [],
  },
  detach: {
    usage: 'connector detach <SESSION_ID> <ACTION>',
    options: [],
  },
  revoke: {
    usage: 'connector revoke <SESSION_ID> <ACTION>',
    options: [],
  },
});

/**
 * @param {string[]} positionals
 * @param {Record<string, string | boolean | undefined>} values
 * @returns {import('../../types/connectors.js').ConnectorCliRequest | undefined}
 */
export function parseConnectorCommand(positionals, values) {
  if (positionals[0] !== 'connector') { return; }
  let command = positionals[1];
  if (!command || !Object.hasOwn(CONNECTOR_COMMANDS, command)) { throw new CommandError('Unknown connector command. Use --help.'); }
  let definition = CONNECTOR_COMMANDS[/** @type {keyof typeof CONNECTOR_COMMANDS} */ (command)];
  let simple = command === 'status' || command === 'list';
  if (positionals.length !== (simple ? 3 : 4)
    || Object.keys(values).some((key) => !/** @type {readonly string[]} */ (definition.options).includes(key) || typeof values[key] !== 'string' || !values[key])
    || !simple && !CONNECTOR_ACTION.test(positionals[3])) { throw new CommandError(`Usage: symbiote-agui ${definition.usage}`); }
  assertSessionId(positionals[2]);
  return {
    kind: 'connector',
    command: /** @type {import('../../types/connectors.js').ConnectorCliRequest['command']} */ (command),
    sessionId: positionals[2],
    ...(simple ? {} : {
      action: positionals[3],
    }),
    values: /** @type {Record<string, string>} */ (values),
  };
}
