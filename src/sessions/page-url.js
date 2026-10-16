/**
 * @param {import('../../types/session.js').SessionStatus} status
 * @param {string} token
 * @returns {import('../../types/session.js').SessionStatus}
 */
export function withAuthorizationUrl(status, token) {
  if (!status.url) { return status; }
  let authorization = new URL(status.url);
  authorization.hash = token;
  return { ...status, authorizationUrl: authorization.href };
}
