import { parseArgs } from 'node:util';
import { assertSessionId } from '../sessions/identity.js';
import { CommandError } from '../shared/command-error.js';
import { COMMANDS, ALL_COMMANDS } from './commands.js';
import { parseLibraryCommand } from './library.js';
import { parseFeedbackCommand } from './feedback.js';
import { parseMetadataCommand } from './metadata.js';

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
        page: { type: 'string' },
        tunnel: { type: 'boolean' },
        query: { type: 'string' },
        key: { type: 'string' },
        'reset-data': { type: 'boolean' },
        conversation: {
          type: 'string',
        },
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
  if (positionals[0] === 'manager') {
    let command = positionals[1] || 'start';
    if (!['start', 'status', 'stop'].includes(command) || positionals.length > 2
      || Object.keys(values).some((key) => key !== 'no-open' || command !== 'start')) {
      throw new CommandError('Usage: symbiote-agui manager [--no-open] | manager status | manager stop');
    }
    return { kind: 'manager', command: /** @type {'start' | 'status' | 'stop'} */ (command), open: !values['no-open'] };
  }
  let library = parseLibraryCommand(positionals, values);
  if (library) { return library; }
  let feedback = parseFeedbackCommand(positionals, values);
  if (feedback) { return feedback; }
  let metadata = parseMetadataCommand(positionals, values);
  if (metadata) { return metadata; }

  let commandLength = positionals[0] === 'tunnel' ? 2 : 1;
  let name = positionals.slice(0, commandLength).join(' ');
  let sessionId = positionals[commandLength];

  if (name === 'mcp') {
    if (positionals.length !== 1 || Object.keys(values).length) { throw new CommandError('Usage: symbiote-agui mcp'); }
    return { kind: 'mcp' };
  }

  let groupedCommand = `${name} ${sessionId}`;
  let allCommand = Object.hasOwn(ALL_COMMANDS, groupedCommand) ? groupedCommand : name;
  if (allCommand && Object.hasOwn(ALL_COMMANDS, allCommand)) {
    let command = /** @type {import('../../types/cli.js').AllSessionsCommand} */ (allCommand);
    let definition = ALL_COMMANDS[command];
    /** @type {string[]} */
    let allowed = definition.options;
    if (positionals.length !== allCommand.split(' ').length || Object.keys(values).some((option) => !allowed.includes(option))) {
      throw new CommandError(`Usage: symbiote-agui ${definition.usage}`);
    }
    return { kind: 'all', command, ...(command === 'start all' ? { open: !values['no-open'] } : {}) };
  }

  if (!name || !Object.hasOwn(COMMANDS, name)) {
    throw new CommandError('Unknown command. Use --help for usage.');
  }

  if (positionals.length !== commandLength + 1 || !sessionId) {
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
    pageId: values.page,
    tunnel: !!values.tunnel,
    ...(values['reset-data'] ? { resetData: true } : {}),
  };
}
