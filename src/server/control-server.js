import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { waitForServer } from '../shared/server.js';
import { SESSION_STATE } from '../sessions/constants.js';
import { readUtf8Markup } from '../markup/read-input.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';

/**
 * @param {import('../../types/session.js').SessionRecord} record
 * @param {() => import('../../types/session.js').SessionStatus} getStatus
 * @param {() => Promise<void>} stop
 * @param {import('../../types/session.js').ControlActions} [actions]
 */
export async function startControlServer(record, getStatus, stop, actions = {}) {
  let server = createServer(async (request, response) => {
    let provided = Buffer.from(request.headers.authorization || '');
    let expected = Buffer.from(`Bearer ${record.controlToken}`);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      response.writeHead(401).end();
      return;
    }

    let action = `${request.method} ${request.url}`;

    if (!['GET /status', 'GET /events', 'POST /stop', 'POST /insert', 'POST /update', 'POST /tools', 'POST /clear', 'POST /share', 'POST /tunnel-renew'].includes(action)) {
      response.writeHead(404).end();
      return;
    }

    let identity = { instanceId: record.instanceId, pid: process.pid };
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');

    try {
      let result = getStatus();
      if (action === 'GET /events') {
        result = actions.events ? actions.events() : { ...result, events: [], dropped: 0 };
      }

      if (action === 'POST /stop') {
        await stop();
        result = { sessionId: record.sessionId, state: SESSION_STATE.STOPPED };
      }

      if (action === 'POST /insert') {
        if (!actions.insert) {
          throw new CommandError('Markup delivery is unavailable in this worker.', ERROR_CODE.INSERT_FAILED, EXIT_CODE.RUNTIME_ERROR);
        }
        result = await actions.insert(await readUtf8Markup(request));
      }
      if (action === 'POST /clear') {
        if (!actions.clear) { throw new CommandError('Clearing is unavailable in this worker.'); }
        result = await actions.clear();
      }
      if (action === 'POST /share') {
        if (!actions.share) { throw new CommandError('Sharing is unavailable in this worker. Stop and restart the session.', ERROR_CODE.TUNNEL_FAILED, EXIT_CODE.RUNTIME_ERROR); }
        result = await actions.share();
      }
      if (action === 'POST /tunnel-renew') {
        if (!actions.tunnelRenew) { throw new CommandError('Tunnel renewal is unavailable in this worker. Stop and restart the session.', ERROR_CODE.TUNNEL_FAILED, EXIT_CODE.RUNTIME_ERROR); }
        result = await actions.tunnelRenew();
      }
      if (action === 'POST /update' || action === 'POST /tools') {
        let handler = action === 'POST /tools' ? actions.tools : actions.update;
        if (!handler) { throw new CommandError('This operation is unavailable in the worker.'); }
        let input;
        try { input = JSON.parse(await readUtf8Markup(request)); }
        catch (error) {
          if (error instanceof CommandError) { throw error; }
          throw new CommandError('Command input must be valid JSON.');
        }
        result = await handler(input);
      }

      response.end(JSON.stringify({ ...identity, result }));

      if (action === 'POST /stop') {
        server.close();
      }
    } catch (error) {
      if (!(error instanceof CommandError)) {
        console.error(error);
      }
      request.resume();
      let failure = error instanceof CommandError
        ? error
        : new CommandError('The worker could not complete the command.', ERROR_CODE.INTERNAL_ERROR, EXIT_CODE.RUNTIME_ERROR);
      response.statusCode = failure.code === ERROR_CODE.INPUT_TOO_LARGE ? 413
        : failure.exitCode === EXIT_CODE.INVALID_INPUT ? 400 : 500;
      response.end(JSON.stringify({
        ...identity,
        error: { code: failure.code, message: failure.message },
        exitCode: failure.exitCode,
      }));
    }
  });

  server.requestTimeout = 5_000;
  server.headersTimeout = 5_000;
  server.listen(0, '127.0.0.1');
  let url = await waitForServer(server);
  return { server, url };
}
