import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { waitForServer } from '../shared/server.js';
import { SESSION_STATE } from '../sessions/constants.js';

/**
 * @param {import('../../types/session.js').SessionRecord} record
 * @param {() => import('../../types/session.js').SessionStatus} getStatus
 * @param {() => Promise<void>} stop
 */
export async function startControlServer(record, getStatus, stop) {
  let server = createServer(async (request, response) => {
    let provided = Buffer.from(request.headers.authorization || '');
    let expected = Buffer.from(`Bearer ${record.controlToken}`);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      response.writeHead(401).end();
      return;
    }

    let action = `${request.method} ${request.url}`;

    if (!['GET /status', 'POST /stop'].includes(action)) {
      response.writeHead(404).end();
      return;
    }

    try {
      if (action === 'POST /stop') {
        await stop();
      }

      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify({
        instanceId: record.instanceId,
        pid: process.pid,
        result: action === 'POST /stop'
          ? { sessionId: record.sessionId, state: SESSION_STATE.STOPPED }
          : getStatus(),
      }));

      if (action === 'POST /stop') {
        server.close();
      }
    } catch (error) {
      console.error(error);
      response.writeHead(500).end();
    }
  });

  server.requestTimeout = 5_000;
  server.headersTimeout = 5_000;
  server.listen(0, '127.0.0.1');
  let url = await waitForServer(server);
  return { server, url };
}
