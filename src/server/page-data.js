import { WebSocket } from 'ws';
import { PAGE_ROLE } from '../transport/constants.js';
import { DATA_LIMITS } from '../data/constants.js';
import { dataObject, validateDataReference, validateDataCommit } from '../data/validate.js';

export class PageData {
  /** @type {Map<WebSocket, Set<string>>} */
  subscribers = new Map();

  /**
   * @param {import('../data/commits.js').SessionData} data
   * @param {Map<string, import('../../types/tools.js').PagePeer>} pages
   * @param {Map<string, import('../../types/session.js').PendingPageRequest>} pending
   */
  constructor(data, pages, pending) {
    this.data = data;
    this.pages = pages;
    this.pending = pending;
    /** @param {import('../../types/data.js').DataResult} result */
    this.completed = (result) => {
      for (let [socket, ids] of this.subscribers) {
        if (ids.delete(result.commitId)) { this.send(socket, { type: 'data-result', result }); }
        if (!ids.size) { this.subscribers.delete(socket); }
      }
    };
    this.changed = () => { for (let { socket } of this.pages.values()) { this.connect(socket); } };
    data.on('result', this.completed);
    data.on('status', this.changed);
  }

  /** @param {WebSocket} socket */
  connect(socket) { this.send(socket, { type: 'data-status', data: this.data.status() }); }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/transport.js').DataServerMessage} message
   */
  send(socket, message) {
    let page = [...this.pages.values()].find((page) => page.socket === socket);
    if (!page || page.role === PAGE_ROLE.VIEWER || socket.readyState !== WebSocket.OPEN) { return; }
    try { socket.send(JSON.stringify(message), (error) => { if (error) { socket.terminate(); } }); }
    catch { socket.terminate(); }
  }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/transport.js').DataPageMessage} message
   * @param {number} bytes
   */
  receive(socket, message, bytes) {
    if (bytes > DATA_LIMITS.bytes) { throw new Error('Data message exceeds limits.'); }
    dataObject(message, message.type === 'data-commit' ? ['type', 'commit'] : ['type', 'references']);
    let page = [...this.pages.values()].find((page) => page.socket === socket);
    if (!page || page.role === PAGE_ROLE.VIEWER) { throw new Error('Viewers cannot persist data.'); }
    if (message.type === 'data-read') {
      if (!Array.isArray(message.references) || message.references.length > DATA_LIMITS.pending) { throw new Error('Invalid receipt read.'); }
      for (let reference of message.references) { this.respond(socket, this.data.read(validateDataReference(reference))); }
      return;
    }
    let commit = validateDataCommit(message.commit);
    if (!page.ready || [...this.pending.values()].some((request) => request.socket === socket)) {
      this.respond(socket, this.data.reject({ commitId: commit.commitId, instanceId: commit.instanceId,
        markupRevision: commit.markupRevision }, 'PAGE_BUSY'));
      return;
    }
    this.respond(socket, this.data.submit(commit));
  }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/data.js').DataResult} result
   */
  respond(socket, result) {
    if (result.state === 'queued') {
      let ids = this.subscribers.get(socket) ?? new Set();
      ids.add(result.commitId);
      this.subscribers.set(socket, ids);
    }
    this.send(socket, { type: 'data-result', result });
  }

  /** @param {WebSocket} socket */
  disconnect(socket) { this.subscribers.delete(socket); }

  close() {
    this.data.off('result', this.completed);
    this.data.off('status', this.changed);
    this.subscribers.clear();
  }
}
