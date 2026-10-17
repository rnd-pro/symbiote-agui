import { SOCKET_PATH } from '../transport/constants.js';

/**
 * @param {import('../../types/session.js').SessionRecord} record
 * @returns {import('../../types/session.js').PageAccess}
 */
export function createPageAccess(record) {
  let path = `/${record.sessionId}/`;
  return {
    path,
    socketPath: `${path}${SOCKET_PATH}`,
  };
}

/**
 * @param {string | undefined} provided
 * @param {string} localOrigin
 * @param {import('../../types/session.js').PageAccess} access
 */
export function isPageOrigin(provided, localOrigin, access) {
  return provided === localOrigin || (!!access.publicOrigin && provided === access.publicOrigin);
}
