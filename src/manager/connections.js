import { connectionProjectRoot, discoverConnectionWorkers } from '../sessions/connection-discovery.js';
import { readScopedSession, isProcessAlive } from '../sessions/store.js';
import { requestSession } from '../sessions/client.js';
import { openSessionPublicLink } from '../sessions/tunnel.js';
import { checkTunnelActivity, waitForTunnelActivity } from '../tunnel/activity.js';
import { TUNNEL_REQUEST_TIMEOUT_MS } from '../tunnel/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { assertSessionId } from '../sessions/identity.js';
import { validProjectId } from '../projects/identifiers.js';
import { listProjects } from '../projects/registry.js';
import { CONNECTION_OPERATIONS } from './connection-operations.js';

/** @param {import('../../types/manager.js').ManagerRequest} request */
export function validateConnectionRequest(request) {
  if (!Object.hasOwn(CONNECTION_OPERATIONS, request.operation)) {
    if (request.pageId !== undefined || request.viewer !== undefined) { throw new CommandError('Connection options require a connection operation.'); }
    return false;
  }
  let listing = request.operation === 'connections';
  let allowed = [
    'id',
    'operation',
    ...(listing ? [] : [
      'sessionId',
      'projectId',
      'instanceId',
      'confirm',
    ]),
    ...(request.operation === 'open public' ? [
      'viewer',
    ] : []),
    ...(request.operation === 'disconnect page' ? [
      'pageId',
    ] : []),
  ];
  if (Object.keys(request).some((key) => !allowed.includes(key))) { throw new CommandError('Invalid connection operation options.'); }
  if (listing) { return true; }
  assertSessionId(request.sessionId || '');
  if (!validProjectId(request.projectId) || (request.instanceId !== undefined && !/^[a-f0-9-]{36}$/.test(request.instanceId))) { throw new CommandError('Choose a current connection from the manager.'); }
  if (request.operation !== 'open public' && !request.instanceId) { throw new CommandError('Refresh Connections before managing a worker.'); }
  if (request.viewer !== undefined && typeof request.viewer !== 'boolean') { throw new CommandError('Viewer must be a boolean.'); }
  if (request.operation === 'disconnect page' && !/^[a-f0-9-]{36}$/.test(request.pageId || '')) { throw new CommandError('Choose a browser connection.'); }
  if (CONNECTION_OPERATIONS[/** @type {keyof typeof CONNECTION_OPERATIONS} */ (request.operation)].confirm && request.confirm !== true) { throw new CommandError('Confirm this connection operation.'); }
  return true;
}

/**
 * @param {Map<string, import('../../types/manager.js').TunnelCheck>} checks
 * @returns {Promise<import('../../types/connections.js').GlobalConnections>}
 */
export async function listManagerConnections(checks) {
  let {
    workers,
    errors,
  } = await discoverConnectionWorkers();
  let known = await listProjects(undefined).catch((error) => {
    errors.push(errorMessage(error));
    return undefined;
  });
  /** @type {import('../../types/connections.js').LiveSessionConnections[]} */
  let sessions = [];
  // Bound concurrent worker requests without hiding failures in other projects.
  let next = 0;
  await Promise.all(Array.from({
    length: Math.min(4, workers.length),
  }, async () => {
    while (next < workers.length) {
      let target = workers[next++];
      let project = known?.projects.find((entry) => entry.id === target.projectId) || {
        id: target.projectId,
        name: target.projectId === 'default' ? 'Default' : `Project ${target.projectId.slice(0, 8)}`,
        lastUsedAt: null,
      };
      let row = {
        project,
        sessionId: target.record.sessionId,
        instanceId: target.record.instanceId,
        pid: target.record.pid,
        url: target.record.url,
        pages: /** @type {import('../../types/tools.js').ConnectedPage[]} */ ([]),
        manageable: false,
      };
      try {
        let status;
        try { status = await requestSession(target.record, 'connections'); }
        catch (error) {
          if (!(error instanceof CommandError) || error.code !== ERROR_CODE.NOT_IMPLEMENTED) { throw error; }
          status = await requestSession(target.record, 'tools', undefined, JSON.stringify({
            action: 'pages',
          }));
        }
        if (status.pageConnections && status.pageConnections.project.id !== target.projectId) {
          throw new CommandError('The worker project no longer matches its storage scope. Reconcile it before managing connections.');
        }
        let check = checks.get(`${target.stateRoot}\0${row.sessionId}`);
        sessions.push({
          ...row,
          state: status.state,
          project: status.pageConnections?.project || project,
          url: status.url,
          publicUrl: status.publicUrl,
          tunnel: status.tunnel && check?.publicUrl === status.publicUrl ? {
            ...status.tunnel,
            ...check?.tunnel,
            state: status.tunnel.state,
          } : status.tunnel,
          pages: status.pageConnections?.pages || (status.toolResponse?.action === 'pages' ? status.toolResponse.pages : []),
          manageable: !!status.pageConnections,
          ...(!status.pageConnections ? {
            error: 'This worker supports inspection only. Save browser drafts before restarting it to enable connection management.',
          } : {}),
        });
      } catch (error) { sessions.push({
        ...row,
        error: errorMessage(error),
      }); }
    }
  }));
  sessions.sort((a, b) => a.project.name.localeCompare(b.project.name) || a.sessionId.localeCompare(b.sessionId));
  return {
    checkedAt: new Date().toISOString(),
    sessions,
    errors,
  };
}

/**
 * @param {import('../../types/manager.js').ManagerRequest} request
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function runManagerConnection(request) {
  let record = await readScopedSession(request.sessionId || '', connectionProjectRoot(request.projectId || ''));
  if (!record || !isProcessAlive(record.pid) || request.instanceId && request.instanceId !== record.instanceId) {
    throw new CommandError('This worker has stopped or restarted. Refresh Connections before acting.');
  }
  let status;
  let openUrl;
  if (request.operation === 'open public') {
    let opened = await openSessionPublicLink(record, request.viewer);
    status = opened.status;
    openUrl = opened.url;
  } else if (request.operation === 'connection tunnel check') {
    status = await checkTunnelActivity(await requestSession(record, 'status'));
  } else if (request.operation === 'connection tunnel renew') {
    status = await waitForTunnelActivity(await requestSession(record, 'tunnel-renew', TUNNEL_REQUEST_TIMEOUT_MS));
  } else if (request.operation === 'stop tunnel') {
    status = await requestSession(record, 'tunnel-stop');
  } else {
    status = await requestSession(record, 'connections/disconnect', undefined, JSON.stringify({
      instanceId: record.instanceId,
      pageId: request.pageId,
    }));
  }
  let ok = !request.operation.includes('tunnel') || request.operation === 'stop tunnel' || status.tunnel?.active === true;
  return {
    ok,
    ...(openUrl ? {
      openUrl,
    } : {}),
    sessions: [
      {
        ok: true,
        ...status,
        pid: record.pid,
      },
    ],
    ...(!ok ? {
      error: {
        code: ERROR_CODE.TUNNEL_FAILED,
        message: status.tunnel?.checkError || 'The tunnel is not reachable.',
      },
    } : {}),
  };
}
