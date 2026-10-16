import { timingSafeEqual } from 'node:crypto';
import { AUTHORIZATION_PATH, PAGE_COOKIE_PREFIX, SOCKET_PATH } from '../transport/constants.js';

/**
 * @param {import('../../types/session.js').SessionRecord} record
 * @returns {import('../../types/session.js').PageAccess}
 */
export function createPageAccess(record) {
  let path = `/${record.sessionId}/`;
  return {
    path,
    socketPath: `${path}${SOCKET_PATH}`,
    authorizationPath: `${path}${AUTHORIZATION_PATH}`,
    cookieName: `${PAGE_COOKIE_PREFIX}${record.instanceId}`,
    token: record.pageToken,
  };
}

/**
 * @param {string} supplied
 * @param {string} expected
 */
function matchesToken(supplied, expected) {
  let value = Buffer.from(supplied);
  let token = Buffer.from(expected);
  return value.length === token.length && timingSafeEqual(value, token);
}

/**
 * @param {import('node:http').IncomingMessage} request
 * @param {import('../../types/session.js').PageAccess} access
 */
export function hasPageAccess(request, access) {
  let prefix = `${access.cookieName}=`;
  let cookies = (request.headers.cookie || '').split(';').map((cookie) => cookie.trim()).filter((cookie) => cookie.startsWith(prefix));
  return cookies.length === 1 && matchesToken(cookies[0].slice(prefix.length), access.token);
}

/**
 * @param {import('node:http').IncomingMessage} request
 * @param {import('node:http').ServerResponse} response
 * @param {string} origin
 * @param {import('../../types/session.js').PageAccess} access
 */
export function authorizePage(request, response, origin, access) {
  if (request.method === 'GET') {
    response.writeHead(hasPageAccess(request, access) ? 204 : 401).end();
    return;
  }
  if (request.method !== 'POST') {
    response.writeHead(405).end();
    return;
  }
  if (request.headers.origin !== origin || !matchesToken(request.headers.authorization || '', `Bearer ${access.token}`)) {
    response.writeHead(403).end();
    return;
  }
  response.setHeader('Set-Cookie', `${access.cookieName}=${access.token}; Path=${access.path}; HttpOnly; SameSite=Strict`);
  response.writeHead(204).end();
}
