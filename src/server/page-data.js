import { WebSocket } from 'ws';
import { PAGE_ROLE, MAX_PAGE_MESSAGE_BYTES } from '../transport/constants.js';
import { DATA_LIMITS } from '../data/constants.js';
import { dataObject, validateDataReference, validateDataCommit } from '../data/validate.js';
import { definitionInfo } from '../library/descriptions.js';

export class PageData {
  /** @type {Map<WebSocket, Set<string>>} */
  subscribers = new Map();
  /** @type {Set<WebSocket>} */
  informationReads = new Set();

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
   * @param {import('../../types/transport.js').DataServerMessage | import('../../types/transport.js').SessionInformationServerMessage} message
   */
  send(socket, message) {
    let page = [...this.pages.values()].find((page) => page.socket === socket);
    if (!page || page.role === PAGE_ROLE.VIEWER || socket.readyState !== WebSocket.OPEN) { return; }
    try { socket.send(JSON.stringify(message), (error) => { if (error) { socket.terminate(); } }); }
    catch { socket.terminate(); }
  }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/transport.js').DataPageMessage | import('../../types/transport.js').SessionInformationPageMessage} message
   * @param {number} bytes
   */
  receive(socket, message, bytes) {
    if (bytes > DATA_LIMITS.bytes) { throw new Error('Data message exceeds limits.'); }
    let page = [...this.pages.values()].find((page) => page.socket === socket);
    if (!page || page.role === PAGE_ROLE.VIEWER) { throw new Error('Viewers cannot persist data.'); }
    if (message.type === 'session-info-read') {
      dataObject(message, [
        'type',
        'id',
      ]);
      if (typeof message.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(message.id)) { throw new Error('Invalid information request.'); }
      void this.readInformation(socket, message.id);
      return;
    }
    dataObject(message, message.type === 'data-commit' ? ['type', 'commit'] : ['type', 'references']);
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
   * @param {string} id
   */
  async readInformation(socket, id) {
    if (this.informationReads.has(socket)) { return; }
    this.informationReads.add(socket);
    /** @type {import('../../types/transport.js').SessionInformation | null} */
    let info = null;
    try {
      let definition = await definitionInfo(this.data.runtime.record.sessionId);
      info = {
        sessionId: this.data.runtime.record.sessionId,
        description: definition.description ?? '',
        metadata: definition.metadata ?? {},
      };
      if (Buffer.byteLength(JSON.stringify(info)) > MAX_PAGE_MESSAGE_BYTES) { info = null; }
    } catch {
      // Storage errors can contain local paths; send only an unavailable result.
    } finally {
      this.informationReads.delete(socket);
    }
    this.send(socket, {
      type: 'session-info',
      id,
      info,
    });
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
