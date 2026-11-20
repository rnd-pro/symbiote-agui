import { PubSub } from '@symbiotejs/symbiote';
import { DATA_LIMITS, dataFailure } from '../../data/constants.js';
import { validateDataCommit, validateDataReference } from '../../data/validate.js';
import { feedbackSuppressed } from './feedback-guard.js';
import { updateDataContext } from './data-context.js';
export { getDataState } from './data-context.js';

/** @type {(message: string) => boolean} */
let send = () => false;
/** @type {import('../../../types/data.js').DataStatus | undefined} */
let status;
/** @type {string | undefined} */
let baseRevision;
let renderedRevision = -1;
let connected = false;
let interactive = true;
let initialized = false;
/** @type {import('../../../types/data.js').DataReference | undefined} */
let latest;
/** @type {Map<string, import('../../../types/data.js').DataClientRequest>} */
let requests = new Map();
/** @type {Map<string, import('../../../types/data.js').DataReference>} */
let uncertain = new Map();

/** @param {(message: string) => boolean} sender */
export function setDataSender(sender) { send = sender; }

/**
 * @param {import('../../../types/data.js').DataReference} left
 * @param {import('../../../types/data.js').DataReference | undefined} right
 */
function matches(left, right) {
  return !!right && left.commitId === right.commitId && left.instanceId === right.instanceId && left.markupRevision === right.markupRevision;
}

function publishState() {
  updateDataContext({ connected: connected && interactive && initialized, current: status ?? null,
    baseRevision: baseRevision ?? null, pending: requests.size,
    stale: !!status && (status.markupRevision !== renderedRevision || (!!baseRevision && baseRevision !== status.revision)) });
}

/** @param {number} revision */
export function setDataRendered(revision) {
  renderedRevision = revision;
  baseRevision = status?.markupRevision === revision ? status.revision : undefined;
  publishState();
}

/** @param {boolean} value */
export function setDataConnected(value) {
  connected = value;
  initialized = false;
  if (!value) {
    for (let request of [...requests.values()]) {
      receiveResult({ ...request.reference, state: 'unknown', failure: dataFailure('UNKNOWN_COMMIT') });
    }
  }
  publishState();
}

/** @param {import('../../../types/transport.js').PageRole} role */
export function setDataRole(role) { interactive = role !== 'viewer'; publishState(); }

function recoverReceipts() {
  let references = [...uncertain.values()].filter((item) => item.instanceId === status?.instanceId);
  for (let index = 0; index < references.length; index += DATA_LIMITS.pending) {
    send(JSON.stringify({ type: 'data-read', references: references.slice(index, index + DATA_LIMITS.pending) }));
  }
}

/** @param {import('../../../types/transport.js').DataServerMessage} message */
export function receiveData(message) {
  if (message.type === 'data-result') { receiveResult(message.result); return; }
  let first = !initialized;
  if (status?.instanceId !== message.data.instanceId || status?.markupRevision !== message.data.markupRevision) { baseRevision = undefined; }
  status = message.data;
  initialized = true;
  if (baseRevision === undefined && renderedRevision === status.markupRevision) { baseRevision = status.revision; }
  publishState();
  if (first && interactive) { recoverReceipts(); }
}

/** @param {import('../../../types/data.js').DataResult} result */
function receiveResult(result) {
  let request = requests.get(result.commitId);
  if (!matches(result, request?.reference ?? uncertain.get(result.commitId))) { return; }
  if (result.state !== 'queued' || request?.read) {
    if (result.state === 'unknown' || result.state === 'queued') {
      uncertain.set(result.commitId, { commitId: result.commitId, instanceId: result.instanceId, markupRevision: result.markupRevision });
      while (uncertain.size > DATA_LIMITS.receipts) { uncertain.delete(uncertain.keys().next().value || ''); }
    } else { uncertain.delete(result.commitId); }
    if (request) {
      clearTimeout(request.timer);
      requests.delete(result.commitId);
      if (result.state === 'committed' && result.instanceId === status?.instanceId && result.markupRevision === renderedRevision
        && request.commit && request.commit.baseRevision === baseRevision) {
        baseRevision = result.revision;
      }
      request.resolve(result);
    }
  }
  publishState();
  if (matches(result, latest)) { updateDataContext({ result }); }
}

/**
 * @param {import('../../../types/data.js').DataReference} reference
 * @param {keyof typeof import('../../data/constants.js').DATA_FAILURES} code
 */
function reject(reference, code) {
  let recovering = uncertain.has(reference.commitId);
  let result = { ...reference, state: /** @type {'unknown' | 'rejected'} */ (recovering ? 'unknown' : 'rejected'),
    failure: dataFailure(recovering ? 'UNKNOWN_COMMIT' : code) };
  if (!feedbackSuppressed()) { latest = reference; updateDataContext({ result }); }
  return Promise.resolve(result);
}

/**
 * @param {import('../../../types/data.js').DataReference} reference
 * @param {import('../../../types/data.js').DataCommit} [commit]
 */
function request(reference, commit) {
  let existing = requests.get(reference.commitId);
  if (existing) {
    if (!commit && matches(reference, existing.reference)) { return Promise.resolve({ ...reference, state: /** @type {'queued'} */ ('queued') }); }
    return matches(reference, existing.reference) && JSON.stringify(existing.commit) === JSON.stringify(commit)
      ? existing.promise : reject(reference, 'INVALID_DATA');
  }
  if (!connected || !interactive || !initialized) { return reject(reference, 'DISCONNECTED'); }
  if (requests.size >= DATA_LIMITS.pending) { return reject(reference, 'QUEUE_FULL'); }
  /** @type {(result: import('../../../types/data.js').DataResult) => void} */
  let resolve = () => {};
  /** @type {Promise<import('../../../types/data.js').DataResult>} */
  let promise = new Promise((done) => { resolve = done; });
  let timer = window.setTimeout(() => receiveResult({ ...reference, state: 'unknown', failure: dataFailure('UNKNOWN_COMMIT') }), DATA_LIMITS.timeoutMs);
  requests.set(reference.commitId, { reference, commit, read: !commit, resolve, promise, timer });
  latest = reference;
  let message = commit ? { type: 'data-commit', commit } : { type: 'data-read', references: [reference] };
  if (!send(JSON.stringify(message))) {
    clearTimeout(timer);
    requests.delete(reference.commitId);
    return reject(reference, 'DISCONNECTED');
  }
  publishState();
  return promise;
}

/**
 * @param {import('../../../types/data.js').DataTarget[]} targets
 * @param {{ commitId?: string }} [options]
 * @returns {Promise<import('../../../types/data.js').DataResult>}
 */
export function commitData(targets, options = {}) {
  let reference = { commitId: options.commitId ?? crypto.randomUUID(), instanceId: status?.instanceId ?? '', markupRevision: renderedRevision };
  if (feedbackSuppressed()) { return reject(reference, 'PAGE_BUSY'); }
  if (!status || !baseRevision || !connected || !interactive || !initialized) { return reject(reference, 'DISCONNECTED'); }
  if (uncertain.has(reference.commitId)) { return reject(reference, 'UNKNOWN_COMMIT'); }
  if (status.markupRevision !== renderedRevision) { return reject(reference, 'STALE_MARKUP'); }
  if (status.revision !== baseRevision) { return reject(reference, 'STALE_DATA'); }
  let commit;
  try {
    let changes = targets.map(({ provider, keys }) => {
      let declared = status?.targets.find((target) => target.provider === provider);
      let context = PubSub.getCtx(provider, false);
      if (!context || !keys.length || keys.some((key) => !declared?.keys.includes(key))) { throw new Error('Undeclared target.'); }
      return { provider, values: Object.fromEntries(keys.map((key) => [key, context.read(key)])) };
    });
    commit = validateDataCommit({ ...reference, baseRevision, changes });
  } catch { return reject(reference, 'INVALID_DATA'); }
  return request(reference, commit);
}

/** @param {import('../../../types/data.js').DataReference} reference */
export function readDataCommit(reference) {
  try { validateDataReference(reference); }
  catch { return reject(reference, 'INVALID_DATA'); }
  return request(reference);
}
