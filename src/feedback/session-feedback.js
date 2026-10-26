import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { CommandError } from '../shared/command-error.js';
import { executeFeedback } from './execute.js';
import { validateFeedbackCheck, validateFeedbackIdentity, validateFeedbackRegistration } from './validate.js';
import { validateFeedbackSubmission, validateFeedbackReference } from './submission.js';
import { DELIVERY_STATE, FEEDBACK_STATE, FEEDBACK_LIMITS, feedbackFailure } from './constants.js';

export class SessionFeedback extends EventEmitter {
  /** @type {import('../../types/feedback.js').FeedbackRegistration | undefined} */
  #registration;
  /** @type {string | undefined} */
  #conversationId;
  /** @type {import('../../types/feedback.js').FeedbackStatus['state']} */
  #state = FEEDBACK_STATE.DISABLED;
  /** @type {import('../../types/feedback.js').FeedbackFailure | undefined} */
  #failure;
  /** @type {import('../../types/feedback.js').FeedbackDelivery | undefined} */
  #lastDelivery;
  /** @type {Map<string, import('../../types/feedback.js').FeedbackReceipt>} */
  #receipts = new Map();
  /** @type {import('../../types/feedback.js').FeedbackSubmission[]} */
  #queue = [];
  /** @type {AbortController | undefined} */
  #active;
  /** @type {Promise<void> | undefined} */
  #running;
  #generation = 0;
  #closed = false;

  /** @param {import('../../types/feedback.js').FeedbackSessionIdentity} identity */
  constructor(identity) {
    super();
    this.identity = Object.freeze({ sessionId: identity.sessionId, instanceId: identity.instanceId });
  }

  /** @returns {import('../../types/feedback.js').FeedbackStatus} */
  status() {
    return structuredClone({ instanceId: this.identity.instanceId, state: this.#state,
      pending: this.#queue.length + Number(!!this.#active),
      ...(this.#lastDelivery ? { lastDelivery: this.#lastDelivery } : {}),
      ...(this.#failure ? { failure: this.#failure } : {}) });
  }

  /** @returns {import('../../types/feedback.js').FeedbackSettings} */
  settings() {
    return structuredClone({
      ...this.identity,
      conversationId: this.#conversationId ?? '',
      command: this.#registration?.command ?? null,
      status: this.status(),
    });
  }

  /**
   * @param {unknown} input
   * @returns {import('../../types/feedback.js').FeedbackCheck}
   */
  check(input) {
    let conversationId = validateFeedbackCheck(input, this.identity);
    /** @type {import('../../types/feedback.js').FeedbackCheck['binding']} */
    let binding = !this.#conversationId ? 'unbound' : this.#conversationId === conversationId ? 'matching' : 'different';
    let ready = binding === 'matching' && this.#state === FEEDBACK_STATE.READY;
    let actions = /** @type {const} */ ({
      unbound: 'configure',
      matching: 'reconnect',
      different: 'restart',
    });
    return {
      instanceId: this.identity.instanceId,
      state: this.#state,
      binding,
      ready,
      action: ready ? 'none' : actions[binding],
    };
  }

  /** @param {unknown} input */
  async configure(input) {
    if (this.#closed || this.#active || this.#queue.length || this.#running) {
      throw new CommandError('Feedback configuration requires an idle, running session. Disable pending feedback first.');
    }
    let generation = ++this.#generation;
    let registration = await validateFeedbackRegistration(input, this.identity);
    if (this.#closed || generation !== this.#generation || this.#active || this.#queue.length) {
      throw new CommandError('Feedback configuration was superseded or the session ended.');
    }
    if (this.#conversationId && registration.conversationId !== this.#conversationId) {
      throw new CommandError('This worker is bound to another conversation. Use a new session instance.');
    }
    this.#conversationId = registration.conversationId;
    this.#registration = registration;
    this.#state = FEEDBACK_STATE.READY;
    this.#failure = undefined;
    this.emit('status', this.status());
    return this.status();
  }

  /** @param {unknown} input */
  async disable(input) {
    validateFeedbackIdentity(input, this.identity);
    this.#deactivate(FEEDBACK_STATE.DISABLED, feedbackFailure('DISABLED'));
    await this.#running;
    return this.status();
  }

  async close() {
    this.#closed = true;
    await this.disable(this.identity);
  }

  /** @param {unknown} input */
  read(input) {
    let reference = validateFeedbackReference(input);
    if (reference.instanceId !== this.identity.instanceId) {
      return { ...reference, state: DELIVERY_STATE.REJECTED, failure: feedbackFailure('STALE_INSTANCE') };
    }
    let receipt = this.#receipts.get(reference.submissionId);
    if (!receipt) { return { ...reference, state: DELIVERY_STATE.UNKNOWN, failure: feedbackFailure('DELIVERY_UNKNOWN') }; }
    if (!Object.is(receipt.delivery.revision, reference.revision)) {
      return { ...reference, state: DELIVERY_STATE.REJECTED, failure: feedbackFailure('INVALID_SUBMISSION') };
    }
    return structuredClone(receipt.delivery);
  }

  /**
   * @param {unknown} input
   * @returns {import('../../types/feedback.js').FeedbackDelivery}
   */
  submit(input) {
    let submission = validateFeedbackSubmission(input);
    let reference = { submissionId: submission.submissionId, instanceId: submission.instanceId,
      ...(submission.revision !== undefined ? { revision: submission.revision } : {}) };
    if (submission.instanceId !== this.identity.instanceId) {
      return { ...reference, state: DELIVERY_STATE.REJECTED, failure: feedbackFailure('STALE_INSTANCE') };
    }
    let fingerprint = createHash('sha256').update(JSON.stringify(submission)).digest('hex');
    let previous = this.#receipts.get(submission.submissionId);
    if (previous) {
      return previous.fingerprint === fingerprint ? structuredClone(previous.delivery)
        : { ...reference, state: DELIVERY_STATE.REJECTED, failure: feedbackFailure('INVALID_SUBMISSION') };
    }
    if (!this.#registration || this.#closed) {
      return { ...reference, state: DELIVERY_STATE.REJECTED,
        failure: feedbackFailure(this.#state === FEEDBACK_STATE.UNAVAILABLE ? 'UNAVAILABLE' : 'DISABLED') };
    }
    if (this.#queue.length + Number(!!this.#active) >= FEEDBACK_LIMITS.pending) {
      return { ...reference, state: DELIVERY_STATE.REJECTED, failure: feedbackFailure('QUEUE_FULL') };
    }
    if (this.#receipts.size >= FEEDBACK_LIMITS.receipts) {
      let oldest = [...this.#receipts].find(([, receipt]) => receipt.delivery.state !== DELIVERY_STATE.QUEUED);
      if (oldest) { this.#receipts.delete(oldest[0]); }
    }
    let delivery = { ...reference, state: DELIVERY_STATE.QUEUED };
    this.#receipts.set(submission.submissionId, { fingerprint, delivery });
    this.#queue.push(submission);
    this.#lastDelivery = delivery;
    this.emit('status', this.status());
    this.#start();
    return structuredClone(delivery);
  }

  #start() {
    if (this.#running) { return; }
    this.#running = Promise.resolve().then(() => this.#drain()).finally(() => {
      this.#running = undefined;
      if (this.#queue.length) { this.#start(); }
    });
  }

  async #drain() {
    while (this.#registration && this.#queue.length) {
      let submission = this.#queue.shift();
      if (!submission) { break; }
      let controller = new AbortController();
      this.#active = controller;
      let envelope = { ...submission, ...this.identity, conversationId: this.#registration.conversationId };
      let result = await executeFeedback(this.#registration.command, envelope, controller.signal);
      this.#active = undefined;
      let { state, ...rest } = result;
      if (state === FEEDBACK_STATE.UNAVAILABLE) {
        this.#complete(submission, { state: DELIVERY_STATE.REJECTED, failure: feedbackFailure('UNAVAILABLE') });
        this.#deactivate(FEEDBACK_STATE.UNAVAILABLE, feedbackFailure('UNAVAILABLE'));
      } else {
        this.#complete(submission, { ...rest, state });
      }
    }
  }

  /**
   * @param {import('../../types/feedback.js').FeedbackStatus['state']} state
   * @param {import('../../types/feedback.js').FeedbackFailure} failure
   */
  #deactivate(state, failure) {
    this.#generation += 1;
    this.#state = state;
    this.#failure = failure;
    this.#registration = undefined;
    this.#active?.abort();
    for (let submission of this.#queue.splice(0)) {
      this.#complete(submission, { state: DELIVERY_STATE.REJECTED, failure });
    }
    this.emit('status', this.status());
  }

  /**
   * @param {import('../../types/feedback.js').FeedbackSubmission} submission
   * @param {Omit<import('../../types/feedback.js').FeedbackDelivery, keyof import('../../types/feedback.js').FeedbackReference>} result
   */
  #complete(submission, result) {
    let receipt = this.#receipts.get(submission.submissionId);
    if (!receipt) { return; }
    receipt.delivery = { submissionId: submission.submissionId, instanceId: submission.instanceId,
      ...(submission.revision !== undefined ? { revision: submission.revision } : {}), ...result };
    this.#lastDelivery = receipt.delivery;
    this.emit('delivery', structuredClone(receipt.delivery));
    this.emit('status', this.status());
  }
}
