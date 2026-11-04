import { WebSocket } from 'ws';
import { PAGE_ROLE } from '../transport/constants.js';
import { CONNECTOR_LIMITS } from '../connectors/constants.js';
import { object, keys } from '../feedback/validate-shape.js';
import { validateConnectorReference } from '../connectors/validate.js';

export class PageConnectors {
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
    if (!page || !page.backendLocal || page.role === PAGE_ROLE.VIEWER || socket.readyState !== WebSocket.OPEN) { return; }
    try { socket.send(JSON.stringify(message), (error) => { if (error) { socket.terminate(); } }); }
    catch { socket.terminate(); }
  }

  /** @param {WebSocket} socket */
  connect(socket) {
    this.send(socket, {
      type: 'connector-status',
      connectors: {
        ...this.service.status(),
        available: !!this.peer(socket)?.ready && !this.service.closing,
      },
    });
  }

  notify() { for (let page of this.pages.values()) { this.connect(page.socket); } }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/connectors.js').ConnectorPageMessage} message
   * @param {number} bytes
   */
  receive(socket, message, bytes) {
    if (bytes > CONNECTOR_LIMITS.messageBytes) { throw new Error('Connector message exceeds its limit.'); }
    object(message);
    keys(message, message.type === 'connector-call' ? [
      'type',
      'call',
    ] : [
      'type',
      'reference',
    ]);
    let page = this.peer(socket);
    if (!page?.backendLocal || page.role === PAGE_ROLE.VIEWER) { throw new Error('Backend calls require a local interactive connection.'); }
    let reference = validateConnectorReference(message.type === 'connector-call' ? message.call : message.reference, message.type === 'connector-call');
    let operation = message.type === 'connector-call' ? this.serialize(async () => {
      let current = this.peer(socket);
      if (!current?.ready || !current.backendLocal || current.role === PAGE_ROLE.VIEWER
        || [...this.pending.values()].some((entry) => entry.socket === socket)) { throw new Error('The page is busy or its role changed.'); }
      return this.service.admit(message.call, 'agui');
    }).then((job) => job.promise) : this.service.read(message.reference, 'agui');
    void operation.then((result) => {
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
