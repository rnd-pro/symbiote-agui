import { readFile } from 'node:fs/promises';
import { startSession } from '../sessions/start.js';
import { statusSession, stopSession, readEvents } from '../sessions/lifecycle.js';
import { insertMarkup, updateState } from '../sessions/insert.js';
import { openPage } from '../browser/open.js';
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
      start: () => startSession(request.sessionId),
      status: () => statusSession(request.sessionId, request.authorize),
      stop: () => stopSession(request.sessionId),
      insert: () => insertMarkup(request.sessionId, request.file),
      update: () => updateState(request.sessionId, request.file),
      events: () => readEvents(request.sessionId),
    };
    let status = await handlers[request.command]();
    if (request.command === 'start' && request.open && status.url) {
      try {
        await openPage(status.authorizationUrl || status.url);
        let { authorizationUrl, ...visible } = status;
        status = { ...visible, opened: true };
      } catch {
        status = { ...status, opened: false, warning: 'Could not open the default browser. Open authorizationUrl manually.' };
      }
    }
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
