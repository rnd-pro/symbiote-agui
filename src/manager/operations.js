import { getSettings } from '../config/settings.js';
import { definitionInfo } from '../library/descriptions.js';
import { listDefinitionIds } from '../library/paths.js';
import { describeDefinition, syncDefinition } from '../library/catalog.js';
import { statusSession, stopSession } from '../sessions/lifecycle.js';
import { ensureSessionStarted } from '../sessions/start.js';
import { clearSession } from '../sessions/clear.js';
import { listSessionIds } from '../sessions/list.js';
import { getStateRoot } from '../sessions/store.js';
import { assertSessionId } from '../sessions/identity.js';
import { shareSession } from '../sessions/share.js';
import { checkSessionTunnel, renewSessionTunnel } from '../sessions/tunnel.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { MANAGER_OPERATIONS, MANAGER_REQUEST_LIMIT, MANAGER_REQUEST_TTL_MS } from './constants.js';
import { configureManagerStorage, managerStorageSettings } from './storage.js';
import { PROJECT_OPERATIONS } from '../projects/constants.js';
import { listProjects } from '../projects/registry.js';
import { runProjectOperation, validateProjectRequest } from './projects.js';
import { validateExplorerRequest } from '../projects/explorer/requests.js';
import { EXPLORER_OPERATIONS } from '../projects/explorer/constants.js';
import { TRANSFER_OPERATIONS } from '../projects/transfer/constants.js';
import { validateTransferRequest } from '../projects/transfer/requests.js';
import { runManagerTransfer } from './transfer.js';

/** @param {unknown} error */
function failure(error) {
  return { ok: false, error: { code: error instanceof CommandError ? error.code : ERROR_CODE.INTERNAL_ERROR, message: errorMessage(error) } };
}

/**
 * @param {unknown} input
 * @returns {import('../../types/manager.js').ManagerRequest}
 */
export function validateManagerRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) { throw new CommandError('Expected a management request.'); }
  let value = /** @type {Record<string, unknown>} */ (input);
  if (Object.keys(value).some((key) => ![
    'id',
    'operation',
    'sessionId',
    'all',
    'confirm',
    'folder',
    'projectId',
    'path',
    'offset',
    'showHidden',
    'destinationProjectId',
    'destinationSessionId',
    'includeData',
    'includeMetadata',
    'transferId',
  ].includes(key))
    || typeof value.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id)
    || typeof value.operation !== 'string' || !Object.hasOwn(MANAGER_OPERATIONS, value.operation)
    || (value.all !== undefined && typeof value.all !== 'boolean')
    || (value.confirm !== undefined && typeof value.confirm !== 'boolean')) {
    throw new CommandError('Invalid management request.');
  }
  let request = /** @type {import('../../types/manager.js').ManagerRequest} */ (input);
  let operation = MANAGER_OPERATIONS[request.operation];
  validateExplorerRequest(request);
  if (validateTransferRequest(request)) { return request; }
  if (validateProjectRequest(request)) { return request; }
  if (request.projectId !== undefined) { throw new CommandError('Project ID is only accepted by project operations.'); }
  if (request.operation === 'configure storage') {
    if (request.sessionId !== undefined || request.all || request.confirm
      || (request.folder !== null && (typeof request.folder !== 'string'
        || !request.folder.trim() || request.folder.length > 4096 || request.folder.includes('\0')))) {
      throw new CommandError('Choose a nonempty save folder, or null for the default cache.');
    }
    return request;
  }
  if (request.folder !== undefined) { throw new CommandError('Folder is only accepted by configure storage.'); }
  if (request.operation === 'snapshot') {
    if (request.sessionId !== undefined || request.all || request.confirm) { throw new CommandError('Snapshot does not accept a target.'); }
  } else if (request.all) {
    if (!operation.bulk || request.sessionId !== undefined) { throw new CommandError('This operation requires one session.'); }
  } else {
    if (typeof request.sessionId !== 'string') { throw new CommandError('A session ID is required.'); }
    assertSessionId(request.sessionId);
  }
  if (operation.confirm && request.confirm !== true) { throw new CommandError('Confirm this operation before sending it.'); }
  return request;
}

export class ManagerOperations {
  scope = { stateRoot: getStateRoot(), settings: getSettings() };
  /** @type {Map<string, Promise<unknown>>} */
  locks = new Map();
  /** @type {Map<string, import('../../types/manager.js').TunnelCheck>} */
  tunnelChecks = new Map();
  /** @type {Map<string, { fingerprint: string; completedAt?: number; result: Promise<import('../../types/manager.js').ManagerResult> }>} */
  requests = new Map();

  /** @param {import('../../types/manager.js').ManagerRecord} [record] */
  constructor(record) {
    this.record = record;
  }

  assertScope() {
    if (getStateRoot() !== this.scope.stateRoot || getSettings().folder !== this.scope.settings.folder) {
      throw new CommandError('The manager storage scope changed. Restart the manager.');
    }
  }

  async snapshot() {
    this.assertScope();
    let [ids, saved] = await Promise.all([listSessionIds(true), listDefinitionIds()]);
    let definitions = new Set(saved);
    let sessions = await Promise.all(ids.map(async (sessionId) => {
      /** @type {import('../../types/manager.js').ManagerSession} */
      let row;
      try {
        let status = await statusSession(sessionId, false);
        let check = this.tunnelChecks.get(sessionId);
        if (status.tunnel && check?.publicUrl === status.publicUrl && check) {
          status.tunnel = { ...status.tunnel, ...check.tunnel, state: status.tunnel.state };
        }
        row = { ok: true, ...status };
      } catch (error) { row = { ...failure(error), ok: false, sessionId, active: null }; }
      if (definitions.has(sessionId)) {
        try { row.definition = await definitionInfo(sessionId); }
        catch (error) { row.definitionError = errorMessage(error); }
      }
      return row;
    }));
    return {
      scope: this.scope,
      checkedAt: new Date().toISOString(),
      sessions,
      storage: managerStorageSettings(this.record),
      projects: await listProjects(this.scope.settings.folder),
    };
  }

  /**
   * @param {unknown} input
   * @returns {Promise<import('../../types/manager.js').ManagerResult>}
   */
  async dispatch(input) {
    try {
      this.assertScope();
      let request = validateManagerRequest(input);
      if (['snapshot', 'describe', 'projects', 'transfer history'].includes(request.operation) || Object.hasOwn(EXPLORER_OPERATIONS, request.operation)) { return await this.execute(request); }
      let fingerprint = JSON.stringify([
        request.operation,
        request.sessionId,
        !!request.all,
        !!request.confirm,
        request.folder,
        request.projectId,
        request.destinationProjectId,
        request.destinationSessionId,
        request.includeData,
        request.includeMetadata,
        request.transferId,
      ]);
      let previous = this.requests.get(request.id);
      if (previous) {
        if (previous.fingerprint !== fingerprint) { throw new CommandError('Request ID was already used for another operation.'); }
        return previous.result;
      }
      for (let [id, entry] of this.requests) {
        if (entry.completedAt && Date.now() - entry.completedAt > MANAGER_REQUEST_TTL_MS) { this.requests.delete(id); }
      }
      if (this.requests.size >= MANAGER_REQUEST_LIMIT) { throw new CommandError('Request history is full. Wait before sending another operation.'); }
      let entry = { fingerprint, result: this.execute(request).catch(failure), completedAt: /** @type {number | undefined} */ (undefined) };
      this.requests.set(request.id, entry);
      void entry.result.then(() => { entry.completedAt = Date.now(); });
      return entry.result;
    } catch (error) { return failure(error); }
  }

  /** @param {import('../../types/manager.js').ManagerRequest} request */
  async execute(request) {
    if (Object.hasOwn(TRANSFER_OPERATIONS, request.operation)) {
      return this.serialize(request.sessionId || '\0transfers', () => runManagerTransfer(request, this.scope));
    }
    if (Object.hasOwn(PROJECT_OPERATIONS, request.operation)) {
      return this.serialize('\0projects', () => runProjectOperation(request, this.record, this.scope));
    }
    if (request.operation === 'configure storage') {
      return this.serialize('\0storage', () => configureManagerStorage(this.record, request.folder ?? null));
    }
    if (request.operation === 'snapshot') { return { ok: true, snapshot: await this.snapshot() }; }
    if (request.operation === 'describe') { return { ok: true, description: await describeDefinition(request.sessionId || '') }; }
    // Reserve single-session queue order before asynchronous discovery can reorder requests.
    let targets = request.all ? await listSessionIds(true) : [
      request.sessionId || '',
    ];
    let sessions = await Promise.all(targets.map((sessionId) => this.serialize(sessionId, async () => {
      try {
        this.assertScope();
        if (!(await listSessionIds(true)).includes(sessionId)) { throw new CommandError(`No session named ${sessionId} in this storage scope.`); }
        let status = await statusSession(sessionId, false);
        if (request.all && ((request.operation === 'stop' && !status.active)
          || (request.operation === 'sync' && (!status.active || !(await listDefinitionIds()).includes(sessionId)))
          || (request.operation.startsWith('tunnel ') && (!status.active || !status.tunnel)))) { return undefined; }
        let operations = {
          start: () => ensureSessionStarted(sessionId, false),
          stop: () => stopSession(sessionId),
          clear: () => clearSession(sessionId),
          sync: () => syncDefinition(sessionId),
          share: () => shareSession(sessionId),
          'tunnel check': () => checkSessionTunnel(sessionId),
          'tunnel renew': () => renewSessionTunnel(sessionId),
        };
        let operation = /** @type {keyof typeof operations} */ (request.operation);
        let result = await operations[operation]();
        if (request.operation.startsWith('tunnel ') && result.tunnel) {
          this.tunnelChecks.set(sessionId, { publicUrl: result.publicUrl, tunnel: result.tunnel });
          if (result.tunnel.active === false) { return { ok: false, ...result, error: { code: ERROR_CODE.TUNNEL_FAILED, message: result.tunnel.checkError || 'The tunnel is inactive.' } }; }
        } else if (['stop', 'clear', 'share'].includes(request.operation)) { this.tunnelChecks.delete(sessionId); }
        return { ok: true, ...result };
      } catch (error) { return { ...failure(error), ok: false, sessionId }; }
    })));
    let results = /** @type {import('../../types/session.js').SessionOperationResult[]} */ (sessions.filter((row) => row !== undefined));
    let ok = results.every((row) => row.ok);
    return { ok, sessions: results };
  }

  /**
   * @template T
   * @param {string} sessionId
   * @param {() => Promise<T>} task
   */
  serialize(sessionId, task) {
    let result = (this.locks.get(sessionId) || Promise.resolve()).then(task);
    let settled = result.then(() => {}, () => {});
    this.locks.set(sessionId, settled);
    void settled.then(() => { if (this.locks.get(sessionId) === settled) { this.locks.delete(sessionId); } });
    return result;
  }
}
