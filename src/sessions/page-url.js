/**
 * @param {import('../../types/session.js').SessionStatus} status
 * @param {string} token
 * @returns {import('../../types/session.js').SessionStatus}
 */
export function withAuthorizationUrl(status, token) {
  if (!status.url) { return status; }
  let authorization = new URL(status.url);
  authorization.hash = token;
  let result = { ...status, authorizationUrl: authorization.href };
  if (status.publicUrl) {
    let publicAuthorization = new URL(status.publicUrl);
    publicAuthorization.hash = token;
    result.publicAuthorizationUrl = publicAuthorization.href;
  }
  return result;
}
