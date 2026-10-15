import { readFile } from 'node:fs/promises';
import { startSession } from '../sessions/start.js';
import { statusSession, stopSession } from '../sessions/lifecycle.js';
import { insertMarkup } from '../sessions/insert.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { HELP } from './commands.js';
import { parseCommand } from './parse.js';

/**
 * @param {string[]} args
 * @returns {Promise<import('../../types/cli.js').ExitCode>}
 */
export async function run(args) {
  try {
    let request = parseCommand(args);

    if (request.kind === 'help') {
      process.stdout.write(`${HELP}\n`);
      return EXIT_CODE.SUCCESS;
    }

    if (request.kind === 'version') {
      let metadata = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
      process.stdout.write(`${metadata.version}\n`);
      return EXIT_CODE.SUCCESS;
    }

    let handlers = {
      start: () => startSession(request.sessionId, request.browser),
      status: () => statusSession(request.sessionId),
      stop: () => stopSession(request.sessionId),
      insert: () => insertMarkup(request.sessionId, request.file),
    };
    let status = await handlers[request.command]();
    process.stdout.write(`${JSON.stringify({ ok: true, ...status })}\n`);
    return EXIT_CODE.SUCCESS;
  } catch (error) {
    let failure = error instanceof CommandError
      ? error
      : new CommandError('Unexpected CLI failure.', ERROR_CODE.INTERNAL_ERROR, EXIT_CODE.RUNTIME_ERROR);

    /** @type {import('../../types/cli.js').CommandFailure} */
    let result = {
      ok: false,
      error: {
        code: failure.code,
        message: failure.message,
      },
    };

    process.stdout.write(`${JSON.stringify(result)}\n`);
    return failure.exitCode;
  }
}
