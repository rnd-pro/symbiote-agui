import { assertSessionId } from '../sessions/identity.js';
import { CommandError } from '../shared/command-error.js';
import { readMarkup } from '../markup/read-input.js';
import { METADATA_COMMANDS } from './commands.js';
import { METADATA_KEYS, METADATA_LIMITS } from '../metadata/constants.js';
import { getSessionMetadata, setSessionMetadata, clearSessionMetadata } from '../metadata/service.js';

/**
 * @param {string[]} positionals
 * @param {Record<string, string | boolean | undefined>} values
 * @returns {import('../../types/cli.js').MetadataCliRequest | undefined}
 */
export function parseMetadataCommand(positionals, values) {
  if (positionals[0] !== 'metadata') { return; }
  let command = positionals[1];
  let sessionId = positionals[2];
  if (!command || !Object.hasOwn(METADATA_COMMANDS, command) || !sessionId || positionals.length !== 3) {
    throw new CommandError('Usage: symbiote-agui metadata get <SESSION_ID> | metadata set <SESSION_ID> [--file <PATH>] | metadata clear <SESSION_ID> --key dataFlow');
  }
  assertSessionId(sessionId);
  let allowed = /** @type {string[]} */ (METADATA_COMMANDS[/** @type {keyof typeof METADATA_COMMANDS} */ (command)].options);
  if (Object.entries(values).some(([key, value]) => !allowed.includes(key) || value === '')
    || (command === 'clear' && (typeof values.key !== 'string' || !METADATA_KEYS.includes(values.key)))) {
    throw new CommandError(`Invalid options for metadata ${command}.`);
  }
  if (command === 'set') { return { kind: 'metadata', command, sessionId, file: /** @type {string | undefined} */ (values.file) }; }
  if (command === 'clear') { return { kind: 'metadata', command, sessionId, key: /** @type {string} */ (values.key) }; }
  return { kind: 'metadata', command: 'get', sessionId };
}

/** @param {import('../../types/cli.js').MetadataCliRequest} request */
export async function runMetadataCommand(request) {
  if (request.command === 'get') { return getSessionMetadata(request.sessionId); }
  if (request.command === 'clear') { return clearSessionMetadata(request.sessionId, request.key); }
  let source = await readMarkup(request.file, process.stdin, METADATA_LIMITS.bytes);
  let value;
  try { value = JSON.parse(source); }
  catch { throw new CommandError('Metadata input must be valid JSON.'); }
  return setSessionMetadata(request.sessionId, value);
}
