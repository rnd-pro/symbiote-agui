import { listProjects } from '../projects/registry.js';
import { withStorageFolder } from '../config/storage-scope.js';
import { PROJECT_OPERATIONS } from '../projects/constants.js';
import { EXPLORER_OPERATIONS } from '../projects/explorer/constants.js';
import { readReceipt } from '../projects/transfer/receipts.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE } from '../shared/constants.js';
import { managerStorageSettings } from './storage.js';
import { ALL_PROJECTS } from './scope.js';

/**
 * @param {import('./operations.js').ManagerOperations} manager
 * @param {import('../../types/manager.js').ManagerRequest} request
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function dispatchAllProjects(manager, request) {
  let listing = await listProjects(manager.defaultFolder);
  listing.currentProjectId = ALL_PROJECTS;
  if (request.operation === 'projects') {
    return {
      ok: true,
      projects: listing,
    };
  }
  if (request.operation === 'recover transfer') {
    let receipt = await readReceipt(request.transferId || '');
    let project = listing.projects.find((entry) => entry.available
      && (entry.id === receipt.source.id || entry.id === receipt.destination.id));
    if (!project) { throw new CommandError('Connect a project belonging to this transfer before recovering it.'); }
    return manager.dispatch({
      ...request,
      scopeProjectId: project.id,
    });
  }
  if (Object.hasOwn(PROJECT_OPERATIONS, request.operation) && !Object.hasOwn(EXPLORER_OPERATIONS, request.operation)) {
    let result = await manager.dispatch({
      ...request,
      scopeProjectId: 'default',
    });
    if (result.projects && request.operation !== 'switch project') { result.projects.currentProjectId = ALL_PROJECTS; }
    return result;
  }
  if (![
    'snapshot',
    'transfer history',
  ].includes(request.operation) && !request.all) {
    throw new CommandError('Choose a specific project or a session from All projects for this operation.');
  }
  let results = await Promise.all(listing.projects.map(async (project) => {
    if (!project.available) { return undefined; }
    let result = await manager.dispatch({
      ...request,
      scopeProjectId: project.id,
    });
    if (!result.ok && result.error) {
      project.available = false;
      project.error = result.error.message;
    }
    return {
      project,
      result,
    };
  }));
  let sessions = results.flatMap((entry) => {
    if (!entry) { return []; }
    return (entry.result.snapshot?.sessions || entry.result.sessions || []).map((session) => ({
      ...session,
      project: entry.project,
    }));
  });
  let errors = listing.projects.filter((project) => !project.available).map((project) => `${project.name}: ${project.error}`);
  let outcome = {
    ok: !errors.length && results.every((entry) => entry?.result.ok),
    ...(errors.length ? {
      error: {
        code: ERROR_CODE.INTERNAL_ERROR,
        message: errors.join('\n'),
      },
    } : {}),
  };
  if (request.operation === 'transfer history') {
    return {
      ...outcome,
      transfers: [
        ...new Map(results.flatMap((entry) => entry?.result.transfers || []).map((receipt) => [
          receipt.id,
          receipt,
        ])).values(),
      ],
    };
  }
  if (request.operation === 'snapshot') {
    return {
      ok: true,
      snapshot: {
        scope: manager.scope,
        checkedAt: new Date().toISOString(),
        sessions,
        projects: listing,
        storage: {
          ...managerStorageSettings(manager.record),
          editable: false,
          message: 'Choose a project to configure its AGUI folder.',
        },
      },
    };
  }
  return {
    ...outcome,
    sessions,
  };
}
