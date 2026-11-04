import { PubSub } from '@symbiotejs/symbiote';
import { withoutFeedback, feedbackSuppressed } from '../../uilib/shared/feedback-guard.js';
import { CONNECTOR_LIMITS } from '../../connectors/constants.js';

export const CONNECTOR_CONTEXT = 'AGUI_CONNECTORS';
let context = PubSub.registerCtx(/** @type {Record<string, unknown>} */ ({
  connected: false,
  current: null,
  pending: 0,
  result: null,
}), CONNECTOR_CONTEXT);
/** @type {(message: string) => boolean} */
let send = () => false;
/** @type {import('../../../types/connectors.js').ConnectorStatus | undefined} */
let status;
let connected = false;
let interactive = true;
let rendered = -1;
/** @type {Map<string, { reference: import('../../../types/connectors.js').ConnectorReference; serialized: string; resolve: (result: import('../../../types/connectors.js').ConnectorResult) => void; promise: Promise<import('../../../types/connectors.js').ConnectorResult>; timer: number }>} */
let pending = new Map();
/** @type {Map<string, string>} */
let uncertain = new Map();

function publish() {
  withoutFeedback(() => context.multiPub({
    connected: connected && interactive && !!status?.available && status.markupRevision === rendered,
    current: status ?? null,
    pending: pending.size,
  }));
}

/** @param {(message: string) => boolean} sender */
export function setConnectorSender(sender) { send = sender; }

/** @param {boolean} value */
export function setConnectorConnected(value) {
  connected = value;
  if (!value) {
    status = undefined;
    for (let request of pending.values()) {
      receiveResult({
        ...request.reference,
        state: 'unknown',
        code: 'DISCONNECTED',
      });
    }
  }
  publish();
}

/** @param {import('../../../types/transport.js').PageRole} role */
export function setConnectorRole(role) { interactive = role !== 'viewer'; publish(); }

/** @param {number} revision */
export function setConnectorRendered(revision) { rendered = revision; publish(); }

/** @param {import('../../../types/connectors.js').ConnectorServerMessage} message */
export function receiveConnectors(message) {
  if (message.type === 'connector-result') { receiveResult(message.result); return; }
  let recovering = !status?.available;
  status = message.connectors;
  publish();
  if (recovering && status.available && interactive) {
    for (let [
      requestId,
      action,
    ] of uncertain) {
      send(JSON.stringify({
        type: 'connector-read',
        reference: {
          action,
          requestId,
          instanceId: status.instanceId,
        },
      }));
    }
  }
}

/** @param {import('../../../types/connectors.js').ConnectorResult} result */
function receiveResult(result) {
  let request = pending.get(result.requestId);
  if (request && (request.reference.action !== result.action || request.reference.instanceId !== result.instanceId)) { return; }
  if (!request && uncertain.get(result.requestId) !== result.action) { return; }
  if (result.state === 'running' || result.state === 'unknown') { uncertain.set(result.requestId, result.action); }
  else { uncertain.delete(result.requestId); }
  if (request) {
    clearTimeout(request.timer);
    pending.delete(result.requestId);
    request.resolve(result);
  }
  withoutFeedback(() => context.multiPub({
    result,
  }));
  publish();
}

/**
 * @param {string} action
 * @param {string} requestId
 * @param {unknown} [input]
 * @param {boolean} [read]
 * @returns {Promise<import('../../../types/connectors.js').ConnectorResult>}
 */
function request(action, requestId, input, read = false) {
  let reference = {
    action,
    requestId,
    instanceId: status?.instanceId ?? '',
  };
  /** @param {string} code */
  let reject = (code) => Promise.resolve({
    ...reference,
    state: /** @type {const} */ ('rejected'),
    code,
  });
  if (!connected || !interactive || !status?.available || status.markupRevision !== rendered) { return reject('NOT_AVAILABLE'); }
  if (!read && feedbackSuppressed()) { return reject('PAGE_BUSY'); }
  if (!read && uncertain.has(requestId)) { return reject('READ_RECEIPT_FIRST'); }
  if (!read && uncertain.size >= 128 || pending.size >= CONNECTOR_LIMITS.pending) { return reject('RECOVERY_FULL'); }
  let call = {
    ...reference,
    revision: status.actions.find((entry) => entry.name === action)?.revision,
    markupRevision: rendered,
    input,
  };
  let serialized;
  try { serialized = JSON.stringify(read ? {
    type: 'connector-read',
    reference,
  } : {
    type: 'connector-call',
    call,
  }); }
  catch { return reject('INVALID_INPUT'); }
  if (new TextEncoder().encode(serialized).length > CONNECTOR_LIMITS.messageBytes) { return reject('INPUT_TOO_LARGE'); }
  let previous = pending.get(requestId);
  if (previous) { return previous.serialized === serialized ? previous.promise : reject('REQUEST_CONFLICT'); }
  /** @type {(result: import('../../../types/connectors.js').ConnectorResult) => void} */
  let resolve = () => {};
  /** @type {Promise<import('../../../types/connectors.js').ConnectorResult>} */
  let promise = new Promise((done) => { resolve = done; });
  let timer = window.setTimeout(() => receiveResult({
    ...reference,
    state: 'unknown',
    code: 'TIMEOUT',
  }), CONNECTOR_LIMITS.executionMs + 10000);
  pending.set(requestId, {
    reference,
    serialized,
    promise,
    resolve,
    timer,
  });
  if (!send(serialized)) { receiveResult({
    ...reference,
    state: 'unknown',
    code: 'DISCONNECTED',
  }); }
  publish();
  return promise;
}

/**
 * @param {string} action
 * @param {unknown} input
 * @param {{ requestId: string }} options
 */
export function callConnector(action, input, options) { return request(action, options.requestId, input); }

/**
 * @param {string} action
 * @param {string} requestId
 */
export function readConnectorReceipt(action, requestId) { return request(action, requestId, undefined, true); }
