import { validProjectId } from '../projects/identifiers.js';

export let ALL_PROJECTS = 'all';

/** @param {unknown} value */
export function validManagerScope(value) {
  return value === ALL_PROJECTS || validProjectId(value);
}

/** @param {Pick<import('../../types/manager.js').ManagerSession, 'project' | 'sessionId'>} session */
export function managerSessionKey(session) {
  return session.project ? `${session.project.id}/${session.sessionId}` : session.sessionId;
}
