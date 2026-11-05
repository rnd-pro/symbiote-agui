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

/**
 * @param {import('node:http').IncomingMessage} request
 * @param {string} localOrigin
 * @param {import('../../types/session.js').PageAccess} access
 */
export function isPageRequest(request, localOrigin, access) {
  let hosts = [
    new URL(localOrigin).host,
    ...(access.publicOrigin ? [
      new URL(access.publicOrigin).host,
    ] : []),
  ];
  let headers = request.headers;
  return hosts.includes(headers.host || '')
    && (headers.origin === undefined || isPageOrigin(headers.origin, localOrigin, access))
    && (headers['sec-fetch-site'] === undefined || [
      'same-origin',
      'none',
    ].includes(String(headers['sec-fetch-site'])));
}
