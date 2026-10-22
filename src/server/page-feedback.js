import { WebSocket } from 'ws';
import { PAGE_ROLE, MAX_EVENT_BYTES } from '../transport/constants.js';
import { FEEDBACK_LIMITS, feedbackFailure } from '../feedback/constants.js';
import { validateFeedbackSubmission } from '../feedback/submission.js';
import { object, keys } from '../feedback/validate-shape.js';

export class PageFeedback {
  /** @type {Map<WebSocket, Set<string>>} */
  subscriptions = new Map();

  /**
   * @param {import('../feedback/session-feedback.js').SessionFeedback} feedback
   * @param {Map<string, import('../../types/tools.js').PagePeer>} pages
   * @param {Map<string, import('../../types/session.js').PendingPageRequest>} pending
   */
  constructor(feedback, pages, pending) {
    this.feedback = feedback;
    this.pages = pages;
    this.pending = pending;
    /** @param {import('../../types/feedback.js').FeedbackDelivery} delivery */
    this.delivered = (delivery) => {
      for (let [socket, ids] of this.subscriptions) {
        if (ids.delete(delivery.submissionId)) { this.send(socket, { type: 'feedback-result', delivery }); }
        if (!ids.size) { this.subscriptions.delete(socket); }
      }
    };
    this.changed = () => {
      for (let { socket } of pages.values()) { this.connect(socket); }
    };
    feedback.on('delivery', this.delivered);
    feedback.on('status', this.changed);
  }

  /** @param {WebSocket} socket */
  connect(socket) {
    this.send(socket, { type: 'feedback-status', feedback: this.feedback.status() });
  }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/transport.js').FeedbackServerMessage} message
   */
  send(socket, message) {
    let page = [...this.pages.values()].find((page) => page.socket === socket);
    if (!page || page.role === PAGE_ROLE.VIEWER || socket.readyState !== WebSocket.OPEN) { return; }
    try { socket.send(JSON.stringify(message), (error) => { if (error) { socket.terminate(); } }); }
    catch { socket.terminate(); }
  }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/transport.js').FeedbackPageMessage} message
   * @param {number} bytes
   */
  receive(socket, message, bytes) {
    if (bytes > MAX_EVENT_BYTES) { throw new Error('Feedback message exceeds 16 KiB.'); }
    object(message);
    keys(message, message.type === 'feedback-submit' ? ['type', 'submission'] : ['type', 'references']);
    let page = [...this.pages.values()].find((page) => page.socket === socket);
    if (!page || page.role === PAGE_ROLE.VIEWER) { throw new Error('Viewers cannot submit feedback.'); }
    if (message.type === 'feedback-read') {
      if (!Array.isArray(message.references) || message.references.length > FEEDBACK_LIMITS.pending) {
        throw new Error('Invalid feedback receipt request.');
      }
      for (let reference of message.references) { this.respond(socket, this.feedback.read(reference)); }
      return;
    }
    let processing = !page.ready || [...this.pending.values()].some((request) =>
      request.socket === socket);
    if (processing) {
      let { event, ...reference } = validateFeedbackSubmission(message.submission);
      this.respond(socket, { ...reference, state: 'rejected', failure: feedbackFailure('AGENT_UPDATE') });
      return;
    }
    this.respond(socket, this.feedback.submit(message.submission));
  }

  /**
   * @param {WebSocket} socket
   * @param {import('../../types/feedback.js').FeedbackDelivery} delivery
   */
  respond(socket, delivery) {
    if (delivery.state === 'queued') {
      let ids = this.subscriptions.get(socket) ?? new Set();
      ids.add(delivery.submissionId);
      this.subscriptions.set(socket, ids);
    }
    this.send(socket, { type: 'feedback-result', delivery });
  }

  /** @param {WebSocket} socket */
  disconnect(socket) { this.subscriptions.delete(socket); }

  close() {
    this.feedback.off('delivery', this.delivered);
    this.feedback.off('status', this.changed);
    this.subscriptions.clear();
  }
}
