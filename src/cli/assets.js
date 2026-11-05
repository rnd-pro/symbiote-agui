import { assertSessionId } from '../sessions/identity.js';
import { CommandError } from '../shared/command-error.js';
import { ASSET_LIMITS } from '../assets/constants.js';
import { assetPath } from '../assets/paths.js';

export let ASSET_COMMANDS = Object.freeze({
  add: {
    usage: 'assets add <SESSION_ID> --file <SOURCE> [--as <RELATIVE_PATH>] [--replace]',
    options: [
      'file',
      'as',
      'replace',
    ],
  },
  list: {
    usage: 'assets list <SESSION_ID> [--offset <N>] [--limit <N>]',
    options: [
      'offset',
      'limit',
    ],
  },
  remove: {
    usage: 'assets remove <SESSION_ID> --path <RELATIVE_PATH>',
    options: [
      'path',
    ],
  },
});

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} minimum
 * @param {number} maximum
 */
function pageNumber(value, fallback, minimum, maximum) {
  if (value === undefined) { return fallback; }
  let number = typeof value === 'string' && /^(?:0|[1-9][0-9]*)$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new CommandError(`Asset pagination requires bounded nonnegative integers and a limit from 1 to ${ASSET_LIMITS.maxPageSize}.`);
  }
  return number;
}

/**
 * @param {string[]} positionals
 * @param {Record<string, string | boolean | undefined>} values
 * @returns {import('../../types/assets.js').AssetCliRequest | undefined}
 */
export function parseAssetCommand(positionals, values) {
  if (positionals[0] !== 'assets') { return; }
  let command = positionals[1];
  let sessionId = positionals[2];
  if (!Object.hasOwn(ASSET_COMMANDS, command || '') || positionals.length !== 3 || !sessionId) {
    throw new CommandError('Use assets add, list, or remove with exactly one SESSION_ID. See --help for options.');
  }
  let definition = ASSET_COMMANDS[/** @type {keyof typeof ASSET_COMMANDS} */ (command)];
  if (Object.entries(values).some(([
    key,
    value,
  ]) => !definition.options.includes(key) || value === '')) {
    throw new CommandError(`Usage: symbiote-agui ${definition.usage}`);
  }
  assertSessionId(sessionId);
  if (command === 'list') { return {
    kind: 'assets',
    command,
    sessionId,
    offset: pageNumber(values.offset, 0, 0, Number.MAX_SAFE_INTEGER),
    limit: pageNumber(values.limit, ASSET_LIMITS.pageSize, 1, ASSET_LIMITS.maxPageSize),
  }; }
  if (command === 'remove') { return {
    kind: 'assets',
    command,
    sessionId,
    path: assetPath(values.path),
  }; }
  if (typeof values.file !== 'string' || !values.file.trim()) { throw new CommandError(`Usage: symbiote-agui ${ASSET_COMMANDS.add.usage}`); }
  return {
    kind: 'assets',
    command: 'add',
    sessionId,
    file: values.file,
    path: values.as === undefined ? undefined : assetPath(values.as),
    replace: !!values.replace,
  };
}
