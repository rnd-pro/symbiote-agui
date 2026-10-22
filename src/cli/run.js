import { readFile } from 'node:fs/promises';
import { startSession } from '../sessions/start.js';
import { statusSession, stopSession, readEvents } from '../sessions/lifecycle.js';
import { insertMarkup, updateState } from '../sessions/insert.js';
import { openSessionPage } from '../browser/open.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { HELP } from './commands.js';
import { parseCommand } from './parse.js';
import { clearSession } from '../sessions/clear.js';
import { requestTools, isToolError } from '../tools/client.js';
import { callTool } from './tools.js';
import { runAllSessions } from '../sessions/all.js';
import { shareSession } from '../sessions/share.js';
import { errorMessage } from '../shared/system-error.js';
import { checkSessionTunnel, renewSessionTunnel } from '../sessions/tunnel.js';
import { describeDefinition, saveDefinition, syncDefinition } from '../library/catalog.js';
import { runLibraryCommand } from './library.js';
import { runFeedbackCommand } from './feedback.js';
import { runMetadataCommand } from './metadata.js';

/** @param {import('../../types/cli.js').CommandResult} result */
function printResult(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

/**
 * @param {string[]} args
 * @returns {Promise<import('../../types/cli.js').ExitCode>}
 */
export async function run(args) {
  try {
    let request = parseCommand(args);
    if (request.kind === 'metadata') {
      printResult({ ok: true, ...await runMetadataCommand(request) });
      return EXIT_CODE.SUCCESS;
    }
    if (request.kind === 'feedback') {
      printResult({ ok: true, ...await runFeedbackCommand(request) });
      return EXIT_CODE.SUCCESS;
    }
    if (request.kind === 'manager') {
      let { startManager, statusManager, stopManager } = await import('../manager/lifecycle.js');
      let operations = { start: () => startManager(request.open), status: statusManager, stop: stopManager };
      printResult({ ok: true, ...await operations[request.command]() });
      return EXIT_CODE.SUCCESS;
    }
    if (request.kind === 'library') {
      printResult({ ok: true, ...await runLibraryCommand(request) });
      return EXIT_CODE.SUCCESS;
    }

    if (request.kind === 'mcp') {
      try {
        let { startMcpServer } = await import('../mcp/server.js');
        await startMcpServer();
        return EXIT_CODE.SUCCESS;
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        return EXIT_CODE.RUNTIME_ERROR;
      }
    }

    if (request.kind === 'help') {
      process.stdout.write(`${HELP}\n`);
      return EXIT_CODE.SUCCESS;
    }

    if (request.kind === 'version') {
      let metadata = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
      process.stdout.write(`${metadata.version}\n`);
      return EXIT_CODE.SUCCESS;
    }

    if (request.kind === 'all') {
      let result = await runAllSessions(request.command);
      if (request.command === 'start all' && request.open) {
        result.sessions = await Promise.all(result.sessions.map(async (session) => session.ok
          ? { ...session, ...await openSessionPage(session) }
          : session));
      }
      printResult(result);
      return result.ok ? EXIT_CODE.SUCCESS : EXIT_CODE.RUNTIME_ERROR;
    }

    let handlers = {
      save: () => saveDefinition(request.sessionId, request.file),
      describe: () => describeDefinition(request.sessionId, request.file),
      sync: () => syncDefinition(request.sessionId),
      start: async () => {
        let local = await startSession(request.sessionId);
        if (!request.tunnel) { return local; }
        try { return { ...local, ...await shareSession(request.sessionId) }; }
        catch (error) {
          throw new CommandError(`${errorMessage(error)} The local session remains running. Use status, share, or stop for ${request.sessionId}.`, ERROR_CODE.TUNNEL_FAILED, EXIT_CODE.RUNTIME_ERROR);
        }
      },
      status: () => statusSession(request.sessionId),
      stop: () => stopSession(request.sessionId),
      clear: () => clearSession(request.sessionId),
      share: () => shareSession(request.sessionId),
      'tunnel renew': () => renewSessionTunnel(request.sessionId),
      'tunnel check': () => checkSessionTunnel(request.sessionId),
      insert: () => insertMarkup(request.sessionId, request.file),
      update: () => updateState(request.sessionId, request.file),
      events: () => readEvents(request.sessionId),
      pages: () => requestTools(request.sessionId, { action: 'pages' }),
      tools: () => requestTools(request.sessionId, { action: 'tools', pageId: request.pageId }),
      call: () => callTool(request.sessionId, request.file),
    };
    let status = await handlers[request.command]();
    if (request.command === 'start' && request.open && 'url' in status && status.url) {
      status = await openSessionPage(status);
    }
    if (request.command.startsWith('tunnel ') && 'tunnel' in status && status.tunnel?.active === false) {
      printResult({ ok: false, ...status, error: { code: ERROR_CODE.TUNNEL_FAILED, message: status.tunnel.checkError || 'The tunnel is inactive.' } });
      return EXIT_CODE.RUNTIME_ERROR;
    }
    if ('action' in status && status.action === 'call' && isToolError(status.result)) {
      printResult({
        ok: false,
        ...status,
        error: { code: ERROR_CODE.TOOL_FAILED, message: 'The page tool reported an error. See result for details.' },
      });
      return EXIT_CODE.RUNTIME_ERROR;
    }
    printResult({ ok: true, ...status });
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

    printResult(result);
    return failure.exitCode;
  }
}
