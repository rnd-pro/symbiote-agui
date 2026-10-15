import { parseArgs } from 'node:util';
import { assertSessionId } from '../sessions/identity.js';
import { CommandError } from '../shared/command-error.js';
import { COMMANDS } from './commands.js';

/**
 * @param {string[]} args
 * @returns {import('../../types/cli.js').CliRequest}
 */
export function parseCommand(args) {
  let parsed;

  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        'no-open': { type: 'boolean' },
        file: { type: 'string' },
      },
    });
  } catch (error) {
    throw new CommandError(error instanceof Error ? error.message : 'Invalid arguments.');
  }

  let { values, positionals } = parsed;

  if (values.help || args.length === 0) {
    return { kind: 'help' };
  }

  if (values.version) {
    return { kind: 'version' };
  }

  let [name, sessionId] = positionals;

  if (!name || !Object.hasOwn(COMMANDS, name)) {
    throw new CommandError('Unknown command. Use --help for usage.');
  }

  if (positionals.length !== 2 || !sessionId) {
    throw new CommandError(`${name} requires exactly one SESSION_ID.`);
  }

  assertSessionId(sessionId);

  let command = /** @type {import('../../types/cli.js').SessionCommand} */ (name);

  /** @type {string[]} */
  let allowed = COMMANDS[command].options;

  for (let [option, value] of Object.entries(values)) {
    if (!allowed.includes(option) || value === '') {
      throw new CommandError(`Invalid option for ${command}: --${option}.`);
    }
  }

  return {
    kind: 'command',
    command,
    sessionId,
    open: !values['no-open'],
    file: values.file,
  };
}
