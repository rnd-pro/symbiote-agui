import { EventEmitter } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';
import { readCachedMarkup } from '../sessions/cache.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { DATA_LIMITS, dataFailure } from './constants.js';
import { validateDataCommit, validateDataReference } from './validate.js';
import { declaredData, patchData, mergeSavedData } from './markup.js';
import { readRuntimeCache, prepareRuntimeCache, sourceHash } from './cache.js';
import { readMetadata } from '../metadata/store.js';

export class SessionData extends EventEmitter {
  /** @type {string} */
  revision = randomUUID();
  source = '';
  warning = '';
  /** @type {string | undefined} */
  raw;
  /** @type {import('../../types/data.js').DataTarget[]} */
  targets = [];
  /** @type {Map<string, import('../../types/data.js').DataReceipt>} */
  receipts = new Map();
  pending = 0;
  /** @type {import('../../types/metadata.js').DataFlow | undefined} */
  dataFlow;

  /** @param {import('../sessions/runtime.js').SessionRuntime} runtime */
  constructor(runtime) { super(); this.runtime = runtime; }

  /** @param {string} source */
  async restore(source) {
    this.dataFlow = (await readMetadata(this.runtime.record.sessionId)).dataFlow;
    this.source = source;
    let cached = await readRuntimeCache(this.runtime.record.sessionId);
    let html = source;
    if (cached) {
      this.raw = cached.raw;
      this.revision = cached.revision;
      html = cached.html;
      if (cached.sourceHash !== sourceHash(source)) {
        try { html = mergeSavedData(source, cached.html); }
        catch { this.warning = 'The source conflicts with saved data. The previous interface was restored. Sync --reset-data explicitly discards that snapshot.'; }
      }
    }
    this.targets = declaredData(html);
    return html;
  }

  /** @returns {import('../../types/data.js').DataStatus} */
  status() {
    return { instanceId: this.runtime.record.instanceId, markupRevision: this.runtime.latest?.revision ?? 0,
      revision: this.revision, targets: this.targets, ...(this.dataFlow ? { dataFlow: this.dataFlow } : {}) };
  }

  /**
   * @param {string} source
   * @param {boolean} reset
   * @param {boolean} persist
   */
  async prepareReplacement(source, reset, persist) {
    let html = source;
    if (this.raw && !reset && persist) {
      try { html = mergeSavedData(source, this.runtime.latest?.html ?? ''); }
      catch { throw new CommandError('Source changes conflict with committed data. Keep a backup and use sync --reset-data to discard it explicitly.', ERROR_CODE.DATA_CONFLICT, EXIT_CODE.RUNTIME_ERROR); }
    }
    let revision = randomUUID();
    let cache = this.raw && persist
      ? await prepareRuntimeCache(this.runtime.record.sessionId, html, source, revision, this.raw) : undefined;
    return { html, revision, cache };
  }

  /**
   * @param {string} source
   * @param {string} revision
   * @param {string | undefined} raw
   */
  acceptReplacement(source, revision, raw) {
    this.source = source;
    this.revision = revision;
    this.raw = raw;
    this.warning = '';
    this.targets = declaredData(this.runtime.latest?.html ?? '');
    this.emit('status');
  }

  /**
   * @param {import('../../types/data.js').DataReference} reference
   * @param {keyof typeof import('./constants.js').DATA_FAILURES} code
   * @param {'rejected' | 'unknown'} [state]
   * @returns {import('../../types/data.js').DataResult}
   */
  reject(reference, code, state = 'rejected') { return { ...reference, state, failure: dataFailure(code) }; }

  /** @param {unknown} input */
  read(input) {
    let reference = validateDataReference(input);
    if (reference.instanceId !== this.runtime.record.instanceId) { return this.reject(reference, 'STALE_INSTANCE', 'unknown'); }
    let entry = this.receipts.get(reference.commitId);
    return entry && entry.result.markupRevision === reference.markupRevision
      ? entry.result : this.reject(reference, 'UNKNOWN_COMMIT', 'unknown');
  }

  /**
   * @param {unknown} input
   * @returns {import('../../types/data.js').DataResult}
   */
  submit(input) {
    let commit = validateDataCommit(input);
    let { commitId, instanceId, markupRevision } = commit;
    let reference = { commitId, instanceId, markupRevision };
    if (instanceId !== this.runtime.record.instanceId) { return this.reject(reference, 'STALE_INSTANCE'); }
    let fingerprint = createHash('sha256').update(JSON.stringify(commit)).digest('hex');
    let previous = this.receipts.get(commitId);
    if (previous) { return previous.fingerprint === fingerprint ? previous.result : this.reject(reference, 'INVALID_DATA'); }
    if (this.pending >= DATA_LIMITS.pending) { return this.reject(reference, 'QUEUE_FULL'); }
    while (this.receipts.size >= DATA_LIMITS.receipts) {
      let completed = [...this.receipts].find(([, receipt]) => receipt.result.state !== 'queued');
      if (!completed) { return this.reject(reference, 'QUEUE_FULL'); }
      this.receipts.delete(completed[0]);
    }
    let entry = { fingerprint, result: /** @type {import('../../types/data.js').DataResult} */ ({ ...reference, state: 'queued' }) };
    this.receipts.set(commitId, entry);
    this.pending += 1;
    void this.runtime.enqueue(() => this.commit(commit)).then((result) => {
      entry.result = result;
      this.pending -= 1;
      this.emit('result', result);
      this.emit('status');
    }, () => {
      entry.result = this.reject(reference, 'CACHE_FAILED');
      this.pending -= 1;
      this.emit('result', entry.result);
    });
    return entry.result;
  }

  /**
   * @param {import('../../types/data.js').DataCommit} input
   * @returns {Promise<import('../../types/data.js').DataResult>}
   */
  async commit(input) {
    let { commitId, instanceId, markupRevision } = input;
    let reference = { commitId, instanceId, markupRevision };
    let runtime = this.runtime;
    if (runtime.closing || runtime.clearing) { return this.reject(reference, 'SESSION_STOPPED'); }
    if (!runtime.latest || markupRevision !== runtime.latest.revision) { return this.reject(reference, 'STALE_MARKUP'); }
    if (input.baseRevision !== this.revision) { return this.reject(reference, 'STALE_DATA'); }
    if (this.warning) { return this.reject(reference, 'SOURCE_CHANGED'); }
    let html;
    try { html = patchData(runtime.latest.html, input.changes); }
    catch { return this.reject(reference, 'INVALID_TARGET'); }
    let cache;
    try {
      this.dataFlow = (await readMetadata(runtime.record.sessionId)).dataFlow;
      if (await readCachedMarkup(runtime.record.sessionId) !== this.source) { return this.reject(reference, 'SOURCE_CHANGED'); }
      let revision = randomUUID();
      cache = await prepareRuntimeCache(runtime.record.sessionId, html, this.source, revision, this.raw);
      if (runtime.closing || runtime.clearing) { return this.reject(reference, 'SESSION_STOPPED'); }
      await cache.commit();
      runtime.latest = { ...runtime.latest, html };
      this.raw = cache.raw;
      this.revision = revision;
      return { ...reference, state: 'committed', revision };
    } catch { return this.reject(reference, 'CACHE_FAILED'); }
    finally { await cache?.discard().catch(() => {}); }
  }
}
