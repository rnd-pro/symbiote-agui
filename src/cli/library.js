import { configureFolder, getSettings } from '../config/settings.js';
import { listDefinitions } from '../library/catalog.js';
import { CommandError } from '../shared/command-error.js';

/**
 * @param {string[]} positionals
 * @param {Record<string, string | boolean | undefined>} values
 * @returns {import('../../types/cli.js').LibraryRequest | undefined}
 */
export function parseLibraryCommand(positionals, values) {
  if (positionals[0] === 'list') {
    if (positionals.length !== 1 || Object.keys(values).some((key) => key !== 'query') || values.query === '') {
      throw new CommandError('Usage: symbiote-agui list [--query <TEXT>]');
    }
    return { kind: 'library', command: 'list', query: /** @type {string | undefined} */ (values.query) };
  }
  if (positionals[0] !== 'config') { return undefined; }
  if (Object.keys(values).length) { throw new CommandError('Config commands do not accept options.'); }
  let command = positionals.slice(0, 2).join(' ');
  if (command === 'config folder' && positionals.length === 3 && positionals[2]?.trim()) {
    return { kind: 'library', command, folder: positionals[2] };
  }
  if (['config show', 'config reset'].includes(command) && positionals.length === 2) {
    return { kind: 'library', command: /** @type {'config show' | 'config reset'} */ (command) };
  }
  throw new CommandError('Usage: symbiote-agui config folder <PATH> | config show | config reset');
}

/** @param {import('../../types/cli.js').LibraryRequest} request */
export async function runLibraryCommand(request) {
  if (request.command === 'list') { return listDefinitions(request.query); }
  if (request.command === 'config show') { return { settings: getSettings() }; }
  return { settings: await configureFolder(request.command === 'config folder' ? request.folder : undefined) };
}
