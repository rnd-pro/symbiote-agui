import { validProjectId } from '../projects/identifiers.js';
import { MANAGER_ROUTES } from './sections.js';

export let ALL_PROJECTS = 'all';

/** @param {unknown} value */
export function validManagerScope(value) {
  return value === ALL_PROJECTS || validProjectId(value);
}

/** @param {URLSearchParams} parameters */
export function validManagerQuery(parameters) {
  let keys = [...parameters.keys()];
  let first = keys[0];
  if (first && Object.hasOwn(MANAGER_ROUTES, first)) {
    if (parameters.get(first) !== '' || parameters.getAll(first).length !== 1) { return false; }
    keys.shift();
  }
  return keys.every((key) => key === 'project') && parameters.getAll('project').length <= 1
    && (!parameters.has('project') || validManagerScope(parameters.get('project')));
}

/** @param {Pick<import('../../types/manager.js').ManagerSession, 'project' | 'sessionId'>} session */
export function managerSessionKey(session) {
  return session.project ? `${session.project.id}/${session.sessionId}` : session.sessionId;
}
