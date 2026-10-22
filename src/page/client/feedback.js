import { FEEDBACK_LIMITS, feedbackFailure } from '../../feedback/constants.js';
import { validateFeedbackSubmission } from '../../feedback/submission.js';
import { feedbackSuppressed } from './feedback-guard.js';
import { displayFeedbackDelivery, updateFeedbackContext } from './feedback-context.js';

/** @type {(message: string) => boolean} */
let send = () => false;
/** @type {import('../../../types/feedback.js').FeedbackStatus | undefined} */
let serverStatus;
/** @type {import('../../../types/feedback.js').FeedbackReference | undefined} */
let latest;
/** @type {Map<string, import('../../../types/feedback.js').FeedbackClientRequest>} */
let requests = new Map();
/** @type {Map<string, { reference: import('../../../types/feedback.js').FeedbackReference; message: string }>} */
let uncertain = new Map();
let usedEvents = new WeakSet();
let connected = false;
let interactive = true;
let initialized = false;

/** @param {(message: string) => boolean} sender */
export function setFeedbackSender(sender) { send = sender; }

/**
 * @param {import('../../../types/feedback.js').FeedbackReference} left
 * @param {import('../../../types/feedback.js').FeedbackReference | undefined} right
 */
function matches(left, right) {
  return !!right && left.submissionId === right.submissionId && left.instanceId === right.instanceId
    && Object.is(left.revision, right.revision);
}

/** @param {import('../../../types/feedback.js').FeedbackDelivery} delivery */
function receiveDelivery(delivery) {
  let request = requests.get(delivery.submissionId);
  let recovering = uncertain.get(delivery.submissionId);
  if (!matches(delivery, request?.reference ?? recovering?.reference)) { return; }
  if (delivery.state !== 'queued') {
    if (delivery.state === 'unknown' && request) {
      uncertain.set(delivery.submissionId, { reference: request.reference, message: request.message });
      while (uncertain.size > FEEDBACK_LIMITS.receipts) { uncertain.delete(uncertain.keys().next().value || ''); }
    } else if (delivery.state !== 'unknown') { uncertain.delete(delivery.submissionId); }
    if (request) {
      clearTimeout(request.timer);
      requests.delete(delivery.submissionId);
      request.resolve(delivery);
    }
  }
  if (matches(delivery, latest)) { displayFeedbackDelivery(delivery, requests.size); }
  else { updateFeedbackContext({ pending: requests.size }); }
}

/** @param {boolean} value */
export function setFeedbackConnected(value) {
  connected = value;
  initialized = false;
  updateFeedbackContext({ connected: value && interactive });
  if (!value) {
    for (let { reference } of [...requests.values()]) {
      receiveDelivery({ ...reference, state: 'unknown', failure: feedbackFailure('DELIVERY_UNKNOWN') });
    }
    if (latest && uncertain.has(latest.submissionId)) {
      receiveDelivery({ ...latest, state: 'unknown', failure: feedbackFailure('DELIVERY_UNKNOWN') });
    }
  }
}

/** @param {import('../../../types/transport.js').PageRole} role */
export function setFeedbackRole(role) {
  let previous = interactive;
  interactive = role !== 'viewer';
  if (!interactive) { setFeedbackConnected(false); }
  else {
    updateFeedbackContext({ connected: connected && initialized });
    if (!previous && initialized) { recoverReceipts(); }
  }
}

function recoverReceipts() {
  if (!connected || !interactive || !serverStatus) { return; }
  let references = [...uncertain.values()].map(({ reference }) => reference)
    .filter((reference) => reference.instanceId === serverStatus?.instanceId);
  let batch = [];
  for (let reference of references) {
    let next = [...batch, reference];
    if (next.length > FEEDBACK_LIMITS.pending || new TextEncoder().encode(JSON.stringify({ type: 'feedback-read', references: next })).byteLength > FEEDBACK_LIMITS.bytes) {
      send(JSON.stringify({ type: 'feedback-read', references: batch }));
      batch = [];
    }
    batch.push(reference);
  }
  if (batch.length) { send(JSON.stringify({ type: 'feedback-read', references: batch })); }
}

/** @param {import('../../../types/transport.js').FeedbackServerMessage} message */
export function receiveFeedback(message) {
  if (message.type === 'feedback-result') { receiveDelivery(message.delivery); return; }
  let first = !initialized;
  initialized = true;
  serverStatus = message.feedback;
  updateFeedbackContext({ availability: serverStatus.state, connected: connected && interactive });
  if (!first || !interactive) { return; }
  recoverReceipts();
}

/**
 * @param {import('../../../types/feedback.js').FeedbackEvent} event
 * @param {import('../../../types/feedback.js').FeedbackSubmitOptions} options
 * @returns {Promise<import('../../../types/feedback.js').FeedbackDelivery>}
 */
export function submitFeedback(event, options) {
  let reference = { submissionId: options?.submissionId ?? crypto.randomUUID(), instanceId: serverStatus?.instanceId ?? '',
    ...(options?.revision !== undefined ? { revision: options.revision } : {}) };
  /** @param {import('../../../types/feedback.js').FeedbackFailure['code']} code */
  let reject = (code) => {
    let recovery = !['USER_ACTION_REQUIRED', 'AGENT_UPDATE', 'INVALID_SUBMISSION'].includes(code)
      ? uncertain.get(reference.submissionId) : undefined;
    /** @type {import('../../../types/feedback.js').FeedbackDelivery} */
    let delivery = { ...(recovery?.reference ?? reference), state: recovery ? 'unknown' : 'rejected',
      failure: feedbackFailure(recovery ? 'DELIVERY_UNKNOWN' : code) };
    if (!['USER_ACTION_REQUIRED', 'AGENT_UPDATE'].includes(code)) {
      latest = recovery?.reference ?? reference;
      displayFeedbackDelivery(delivery, requests.size);
    }
    return Promise.resolve(delivery);
  };
  if (feedbackSuppressed()) { return reject('AGENT_UPDATE'); }
  if (!(options?.userEvent instanceof Event) || !options.userEvent.isTrusted
    || !['click', 'submit'].includes(options.userEvent.type)
    || Reflect.get(options.userEvent, 'agentInvoked') === true) { return reject('USER_ACTION_REQUIRED'); }
  if (usedEvents.has(options.userEvent)) { return reject('USER_ACTION_REQUIRED'); }
  usedEvents.add(options.userEvent);
  if (!connected || !initialized || !interactive) { return reject('DISCONNECTED'); }
  let submission;
  try { submission = validateFeedbackSubmission({ ...reference, event }); }
  catch { return reject('INVALID_SUBMISSION'); }
  let message = JSON.stringify({ type: 'feedback-submit', submission });
  let previous = requests.get(reference.submissionId) ?? uncertain.get(reference.submissionId);
  if (previous && (previous.message !== message || !matches(reference, previous.reference))) { return reject('INVALID_SUBMISSION'); }
  let pending = requests.get(reference.submissionId);
  if (pending) { return pending.promise; }
  if (!uncertain.has(reference.submissionId) && serverStatus?.state !== 'ready') {
    return reject(serverStatus?.state === 'unavailable' ? 'UNAVAILABLE' : 'DISABLED');
  }
  if (requests.size >= FEEDBACK_LIMITS.pending) { return reject('QUEUE_FULL'); }
  latest = reference;
  /** @type {(result: import('../../../types/feedback.js').FeedbackDelivery) => void} */
  let resolve = () => {};
  /** @type {Promise<import('../../../types/feedback.js').FeedbackDelivery>} */
  let promise = new Promise((done) => { resolve = done; });
  let timer = window.setTimeout(() => {
    receiveDelivery({ ...reference, state: 'unknown', failure: feedbackFailure('DELIVERY_UNKNOWN') });
  }, FEEDBACK_LIMITS.executionMs * FEEDBACK_LIMITS.pending + 2_000);
  requests.set(reference.submissionId, { reference, message, promise, resolve, timer });
  let outgoing = uncertain.has(reference.submissionId) ? JSON.stringify({ type: 'feedback-read', references: [reference] }) : message;
  if (!send(outgoing)) {
    clearTimeout(timer);
    requests.delete(reference.submissionId);
    return reject('DISCONNECTED');
  }
  displayFeedbackDelivery({ ...reference, state: 'queued' }, requests.size);
  return promise;
}
