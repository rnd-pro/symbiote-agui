import { WebSocket } from 'ws';
import { PAGE_ROLE } from '../transport/constants.js';
import { CONNECTOR_ACTION, CONNECTOR_LIMITS, CONNECTOR_PUBLIC_LIMITS } from '../connectors/constants.js';
import { object, keys } from '../feedback/validate-shape.js';
import { validateConnectorReference } from '../connectors/validate.js';

export class PageConnectors {
  /** @type {WeakMap<WebSocket, Map<string, string>>} */
  authorized = new WeakMap();
  /** @type {WeakMap<WebSocket, number>} */
  attempts = new WeakMap();
  authenticationWindow = {
    start: 0,
    count: 0,
  };

  /**
   * @param {import('../connectors/session.js').SessionConnectors} service
   * @param {Map<string, import('../../types/tools.js').PagePeer>} pages
   * @param {Map<string, import('../../types/session.js').PendingPageRequest>} pending
   * @param {(task: () => Promise<{ promise: Promise<import('../../types/connectors.js').ConnectorResult> }>) => Promise<{ promise: Promise<import('../../types/connectors.js').ConnectorResult> }>} serialize
   */
  constructor(service, pages, pending, serialize) {
    this.service = service;
    this.pages = pages;
    this.pending = pending;
    this.serialize = serialize;
  }

  /** @param {WebSocket} socket */
  peer(socket) { return [...this.pages.values()].find((page) => page.socket === socket); }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/connectors.js').ConnectorServerMessage} message
   */
  send(socket, message) {
    let page = this.peer(socket);
    if (!page || page.role === PAGE_ROLE.VIEWER || socket.readyState !== WebSocket.OPEN) { return; }
    try { socket.send(JSON.stringify(message), (error) => { if (error) { socket.terminate(); } }); }
    catch { socket.terminate(); }
  }

  /**
   * @param {WebSocket} socket
   * @param {string} action
   */
  access(socket, action) {
    let page = this.peer(socket);
    if (!page || page.role === PAGE_ROLE.VIEWER) { throw new Error('Backend access is unavailable.'); }
    let id = this.authorized.get(socket)?.get(action);
    if (id) {
      let entry = this.service.publicAccess.get(id, action);
      if (new URL(page.url || '').origin !== entry.origin) { throw new Error('Capability origin changed.'); }
    } else if (!page.backendLocal) { throw new Error('A public capability is required.'); }
    return id;
  }

  /** @param {WebSocket} socket */
  connect(socket) {
    let page = this.peer(socket);
    let status = this.service.status();
    let actions = status.actions.filter((entry) => {
      try { this.access(socket, entry.name); return true; }
      catch { return false; }
    });
    this.send(socket, {
      type: 'connector-status',
      connectors: {
        ...status,
        actions,
        pending: page?.backendLocal ? status.pending : 0,
        available: !!page?.ready && !this.service.closing && (!!page.backendLocal || actions.length > 0),
      },
    });
  }

  notify() { for (let page of this.pages.values()) { this.connect(page.socket); } }

  /**
   * @param {WebSocket} socket
   * @param {Extract<import('../../types/connectors.js').ConnectorPageMessage, { type: 'connector-authorize' }>} message
   */
  authorize(socket, message) {
    keys(message, [
      'type',
      'action',
      'token',
    ]);
    if (typeof message.action !== 'string' || !CONNECTOR_ACTION.test(message.action) || typeof message.token !== 'string' || message.token.length > 128) { throw new Error('Invalid authorization.'); }
    let attempts = (this.attempts.get(socket) ?? 0) + 1;
    this.attempts.set(socket, attempts);
    if (Date.now() - this.authenticationWindow.start >= 60000) {
      this.authenticationWindow = {
        start: Date.now(),
        count: 0,
      };
    }
    if (attempts > CONNECTOR_PUBLIC_LIMITS.authenticationsPerSocket
      || ++this.authenticationWindow.count > CONNECTOR_PUBLIC_LIMITS.authenticationsPerMinute) {
      throw new Error('Too many authentication attempts.');
    }
    let entries = this.authorized.get(socket) ?? new Map();
    this.authorized.set(socket, entries);
    entries.delete(message.action);
    let accepted = false;
    try {
      let page = this.peer(socket);
      if (!page || page.role === PAGE_ROLE.VIEWER) { throw new Error('Viewer access is denied.'); }
      let entry = this.service.publicAccess.authenticate(message.token, message.action, new URL(page.url || '').origin);
      entries.set(message.action, entry.id);
      accepted = true;
    } catch { /* Authentication failures reveal no policy, token, or credential details. */ }
    this.connect(socket);
    this.send(socket, {
      type: 'connector-authorized',
      action: message.action,
      accepted,
    });
  }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/connectors.js').ConnectorPageMessage} message
   * @param {number} bytes
   */
  receive(socket, message, bytes) {
    if (bytes > CONNECTOR_LIMITS.messageBytes) { throw new Error('Connector message exceeds its limit.'); }
    object(message);
    if (message.type === 'connector-authorize') { this.authorize(socket, message); return; }
    keys(message, message.type === 'connector-call' ? [
      'type',
      'call',
    ] : [
      'type',
      'reference',
    ]);
    let reference = validateConnectorReference(message.type === 'connector-call' ? message.call : message.reference, message.type === 'connector-call');
    let page = this.peer(socket);
    if (!page || page.role === PAGE_ROLE.VIEWER || !page.backendLocal && !this.authorized.get(socket)?.has(reference.action)) {
      throw new Error('Backend calls require local admission or a public capability.');
    }
    let selectedId = this.authorized.get(socket)?.get(reference.action);
    let access = () => {
      let current = this.access(socket, reference.action);
      if (current !== selectedId) { throw new Error('The authenticated capability changed.'); }
      return current;
    };
    let operation = message.type === 'connector-call' ? this.serialize(async () => {
      let current = this.peer(socket);
      if (!current?.ready || [...this.pending.values()].some((entry) => entry.socket === socket)) { throw new Error('The page is busy.'); }
      return this.service.admit(message.call, 'agui', access());
    }).then((job) => job.promise) : Promise.resolve().then(() => this.service.read(message.reference, 'agui', access()));
    void operation.then((result) => {
      // Revocation or role changes also block late results and receipt values.
      try { access(); }
      catch (error) {
        this.send(socket, {
          type: 'connector-result',
          result: {
            ...this.service.failure(reference, error),
            state: 'unknown',
          },
        });
        return;
      }
      this.send(socket, {
        type: 'connector-result',
        result,
      });
    }).catch((error) => this.send(socket, {
      type: 'connector-result',
      result: {
        ...this.service.failure(reference, error),
        // A failed lookup cannot establish that an uncertain write never ran.
        ...(message.type === 'connector-read' ? {
          state: 'unknown',
        } : {}),
      },
    }));
  }
}
