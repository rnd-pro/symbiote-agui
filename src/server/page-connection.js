import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { HEARTBEAT_MS, MAX_EVENT_BYTES, MAX_PAGE_MESSAGE_BYTES, PAGE_REQUEST_TIMEOUT_MS } from '../transport/constants.js';
import { hasPageAccess } from './page-access.js';

export class PageConnection {
  /** @type {Set<WebSocket>} */
  clients = new Set();
  /** @type {Map<string, import('../../types/session.js').PendingPageRequest>} */
  pending = new Map();
  /** @type {Map<string, import('../../types/tools.js').PagePeer>} */
  pages = new Map();

  /**
   * @param {import('node:http').Server} server
   * @param {string} origin
   * @param {import('../../types/session.js').PageAccess} access
   * @param {(socket: WebSocket) => Promise<void>} initialize
   * @param {(message: Extract<import('../../types/transport.js').PageMessage, { type: 'event' }>) => void} onEvent
   */
  constructor(server, origin, access, initialize, onEvent) {
    this.server = new WebSocketServer({ noServer: true, maxPayload: MAX_PAGE_MESSAGE_BYTES });
    server.on('upgrade', (request, socket, head) => {
      let endpoint;
      try { endpoint = new URL(request.url || '/', origin); }
      catch { socket.destroy(); return; }
      if (endpoint.pathname !== access.socketPath || endpoint.search || request.headers.origin !== origin || !hasPageAccess(request, access)) {
        socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        return;
      }
      this.server.handleUpgrade(request, socket, head, (client) => this.server.emit('connection', client));
    });

    /** @type {Set<WebSocket>} */
    let alive = new Set();
    this.server.on('connection', (socket) => {
      this.clients.add(socket);
      let pageId = randomUUID();
      let page = { socket, title: 'AGUI', ready: false, error: '' };
      this.pages.set(pageId, page);
      alive.add(socket);
      socket.on('pong', () => alive.add(socket));
      socket.on('error', () => socket.terminate());
      socket.on('close', () => {
        this.clients.delete(socket);
        this.pages.delete(pageId);
        alive.delete(socket);
        for (let [id, pending] of this.pending) {
          if (pending.socket === socket) {
            this.finish(id, new Error('The page disconnected during the request. Its outcome may be unknown; do not retry automatically.'));
          }
        }
      });
      socket.on('message', (data, binary) => {
        try {
          if (binary) { throw new Error('Expected JSON text.'); }
          let message = /** @type {import('../../types/transport.js').PageMessage} */ (JSON.parse(data.toString()));
          if (message.type === 'result' && typeof message.id === 'string' && this.pending.get(message.id)?.socket === socket) {
            this.finish(message.id, message.error ? new Error(String(message.error).slice(0, 2000)) : undefined, message.result);
          } else if (message.type === 'hello' && typeof message.title === 'string') {
            page.title = message.title.slice(0, 200);
          } else if (message.type === 'event' && typeof message.name === 'string' && message.name.length > 0 && message.name.length <= 128 && Buffer.byteLength(data.toString()) <= MAX_EVENT_BYTES) {
            onEvent(message);
          }
        } catch {
          socket.close(1008, 'Invalid page message.');
        }
      });
      void initialize(socket).then(() => { page.ready = true; }).catch((error) => {
        page.error = String(error.message);
        onEvent({ type: 'event', name: 'agui:error', data: { message: String(error.message).slice(0, 2000) } });
        console.error('Could not restore page:', error.message);
      });
    });
    this.heartbeat = setInterval(() => {
      for (let socket of this.clients) {
        if (!alive.delete(socket)) {
          socket.terminate();
        } else {
          socket.ping();
        }
      }
    }, HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  /**
   * @param {string} id
   * @param {Error} [error]
   * @param {unknown} [result]
   */
  finish(id, error, result) {
    let pending = this.pending.get(id);
    if (!pending) { return; }
    this.pending.delete(id);
    clearTimeout(pending.timer);
    error ? pending.reject(error) : pending.resolve(result);
  }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/transport.js').PageCommand} command
   * @returns {Promise<unknown>}
   */
  request(socket, command) {
    return new Promise((resolve, reject) => {
      let id = randomUUID();
      let timer = setTimeout(() => this.finish(id, new Error('The page request timed out. Its outcome may be unknown; do not retry automatically.')), PAGE_REQUEST_TIMEOUT_MS);
      this.pending.set(id, { socket, timer, resolve, reject });
      if (socket.readyState !== WebSocket.OPEN) {
        this.finish(id, new Error('The page is disconnected.'));
        return;
      }
      socket.send(JSON.stringify({ ...command, id }), (error) => {
        if (error) { this.finish(id, error); }
      });
    });
  }

  /** @param {import('../../types/transport.js').PageCommand} command */
  async broadcast(command) {
    let clients = [...this.clients];
    let results = await Promise.allSettled(clients.map((socket) => this.request(socket, command)));
    let failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') { throw failure.reason; }
    return clients.length;
  }

  async close() {
    clearInterval(this.heartbeat);
    for (let id of this.pending.keys()) {
      this.finish(id, new Error('The session ended.'));
    }
    for (let socket of this.clients) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'stop' }));
        socket.close(1000, 'Session ended');
      }
    }
    let timeout = setTimeout(() => {
      for (let socket of this.clients) { socket.terminate(); }
    }, 500);
    await new Promise((resolve) => this.server.close(resolve));
    clearTimeout(timeout);
  }
}
