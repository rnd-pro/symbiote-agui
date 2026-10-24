import { MANAGER_SOCKET_PATH, MANAGER_CLIENT_TIMEOUT_MS } from '../constants.js';

export const CONNECTION_LOST_MESSAGE = 'Connection lost. The operation outcome may be unknown. Reconnecting will refresh status; actions are not replayed.';

export class ManagerConnection {
  /** @type {WebSocket | undefined} */
  socket;
  /** @type {Map<string, { resolve(value: import('../../../types/manager.js').ManagerResult): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>} */
  pending = new Map();
  ready = false;
  closed = false;
  retry = 500;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  reconnect;

  /**
   * @param {(ready: boolean, message: string) => void} status
   * @param {() => void} connected
   */
  constructor(status, connected) {
    this.status = status;
    this.connected = connected;
    let fragment = location.hash.slice(1);
    history.replaceState(null, '', location.pathname);
    this.token = '';
    try {
      if (/^[a-f0-9]{64}$/.test(fragment)) { localStorage.setItem('agui-manager-token', fragment); }
      this.token = localStorage.getItem('agui-manager-token') || '';
    } catch { this.token = fragment; }
  }

  connect() {
    if (!this.token) { this.status(false, 'Open launchUrl from npx symbiote-agui manager to connect this browser.'); return; }
    this.status(false, 'Connecting...');
    let socket = new WebSocket(new URL(MANAGER_SOCKET_PATH, location.href).href.replace(/^http/, 'ws'));
    this.socket = socket;
    socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'authenticate', token: this.token })));
    socket.addEventListener('message', (event) => {
      let reply = JSON.parse(event.data);
      if (reply.type === 'authorized') {
        this.ready = true;
        this.retry = 500;
        this.status(true, 'Connected');
        this.connected();
        return;
      }
      let request = this.pending.get(reply.id);
      if (request) {
        clearTimeout(request.timer);
        this.pending.delete(reply.id);
        request.resolve(reply.result);
      }
    });
    socket.addEventListener('close', (event) => {
      this.ready = false;
      for (let request of this.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(CONNECTION_LOST_MESSAGE));
      }
      this.pending.clear();
      if (this.closed) { return; }
      if (event.code === 1008) {
        this.status(false, 'Connection refused. Reopen launchUrl from npx symbiote-agui manager.');
        return;
      }
      this.status(false, 'Disconnected. Showing the last snapshot. Reconnecting...');
      this.reconnect = setTimeout(() => this.connect(), this.retry);
      this.retry = Math.min(this.retry * 2, 5_000);
    });
    socket.addEventListener('error', () => {});
  }

  /**
   * @param {import('../../../types/manager.js').ManagerOperation} operation
   * @param {Partial<import('../../../types/manager.js').ManagerRequest>} [options]
   * @returns {Promise<import('../../../types/manager.js').ManagerResult>}
   */
  request(operation, options = {}) {
    if (!this.ready || this.socket?.readyState !== WebSocket.OPEN) { return Promise.reject(new Error('Manager is disconnected.')); }
    let id = crypto.randomUUID();
    let socket = this.socket;
    return new Promise((resolve, reject) => {
      let timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Request timed out. Its outcome may be unknown. Status will be refreshed after reconnecting.'));
        socket.close();
      }, MANAGER_CLIENT_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ ...options, id, operation }));
    });
  }

  close() {
    this.closed = true;
    clearTimeout(this.reconnect);
    this.socket?.close();
  }
}
