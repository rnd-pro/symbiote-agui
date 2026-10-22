import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { jsBuild } from 'jsda-kit/server/build-asset.js';
import { WebSocketServer, WebSocket } from 'ws';
import { closeServer, waitForServer } from '../shared/server.js';
import { ManagerOperations } from './operations.js';
import { MANAGER_PATH, MANAGER_SOCKET_PATH } from './constants.js';
import { createManagerStyles } from './styles.js';

/**
 * @param {unknown} value
 * @param {string} expected
 */
function authorized(value, expected) {
  return typeof value === 'string' && Buffer.byteLength(value) === Buffer.byteLength(expected)
    && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

/**
 * @param {import('../../types/manager.js').ManagerRecord} record
 * @param {() => void} stop
 */
export async function startManagerServer(record, stop) {
  let [stylesheet, client] = await Promise.all([
    createManagerStyles(),
    jsBuild(fileURLToPath(new URL('./page/index.js', import.meta.url))),
  ]);
  let operations = new ManagerOperations();
  let origin = '';
  let host = '';
  let assets = new URL('./page/', import.meta.url);
  let files = new Map([[MANAGER_PATH, new URL('index.html', assets)]]);
  files.set(`${MANAGER_PATH}page/theme.js`, new URL('theme.js', assets));
  let server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; font-src data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    if (request.headers.host !== host || (request.headers.origin && request.headers.origin !== origin)) {
      response.writeHead(403).end(); return;
    }
    let path = request.url || '';
    if ([`${MANAGER_PATH}status`, `${MANAGER_PATH}stop`].includes(path)) {
      if (!authorized(request.headers.authorization, `Bearer ${record.token}`)) { response.writeHead(403).end(); return; }
      if ((path.endsWith('/status') && request.method !== 'GET') || (path.endsWith('/stop') && request.method !== 'POST')) {
        response.writeHead(405).end(); return;
      }
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ instanceId: record.instanceId, pid: process.pid }));
      if (path.endsWith('/stop')) { setImmediate(stop); }
      return;
    }
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    if (path === `${MANAGER_PATH}page/styles.css`) {
      response.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' }).end(stylesheet);
      return;
    }
    if (path === `${MANAGER_PATH}page/index.js`) {
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end(client);
      return;
    }
    let file = files.get(path);
    if (!file) { response.writeHead(404).end(); return; }
    try {
      let content = await readFile(file);
      let type = file.pathname.endsWith('.html') ? 'text/html' : file.pathname.endsWith('.css') ? 'text/css' : 'text/javascript';
      response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }).end(content);
    } catch { response.writeHead(404).end(); }
  });
  let sockets = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024, perMessageDeflate: false });
  /** @type {Set<Promise<import('../../types/manager.js').ManagerResult>>} */
  let inflight = new Set();
  let closing = false;
  server.on('upgrade', (request, socket, head) => {
    if (closing || request.url !== MANAGER_SOCKET_PATH || request.headers.host !== host || request.headers.origin !== origin) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    sockets.handleUpgrade(request, socket, head, (client) => sockets.emit('connection', client));
  });
  sockets.on('connection', (socket) => {
    let authenticated = false;
    let pending = 0;
    let timer = setTimeout(() => socket.close(1008, 'Authentication required'), 5_000);
    socket.on('close', () => clearTimeout(timer));
    socket.on('error', () => {});
    socket.on('message', async (data, binary) => {
      try {
        if (binary || closing) { socket.close(1008, 'Invalid request'); return; }
        let message = JSON.parse(data.toString());
        if (!authenticated) {
          if (message.type !== 'authenticate' || !authorized(message.token, record.token)) { socket.close(1008, 'Unauthorized'); return; }
          authenticated = true;
          clearTimeout(timer);
          socket.send(JSON.stringify({ type: 'authorized' }));
          return;
        }
        if (pending >= 16) { socket.close(1008, 'Too many pending requests'); return; }
        pending += 1;
        let operation = operations.dispatch(message);
        inflight.add(operation);
        try {
          let result = await operation;
          if (socket.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ id: typeof message.id === 'string' ? message.id : '', result })); }
        } finally { pending -= 1; inflight.delete(operation); }
      } catch { socket.close(1008, 'Invalid request'); }
    });
  });
  try {
    server.listen(0, '127.0.0.1');
    origin = await waitForServer(server);
    host = new URL(origin).host;
    return {
      url: `${origin}${MANAGER_PATH}`,
      operations,
      async close() {
        closing = true;
        for (let client of sockets.clients) { client.terminate(); }
        await new Promise((resolve) => sockets.close(resolve));
        await Promise.allSettled(inflight);
        await closeServer(server);
      },
    };
  } catch (error) {
    sockets.close();
    await closeServer(server);
    throw error;
  }
}
