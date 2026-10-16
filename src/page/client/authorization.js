import { AUTHORIZATION_PATH, PAGE_TOKEN_PATTERN } from '../../transport/constants.js';

export function createAuthorization() {
  let token = '';
  function readToken() {
    let supplied = location.hash.slice(1);
    if (PAGE_TOKEN_PATTERN.test(supplied)) {
      token = supplied;
      history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    }
  }
  readToken();

  return async () => {
    readToken();
    let url = new URL(AUTHORIZATION_PATH, location.href);
    if (token) {
      let response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'same-origin',
      });
      if (!response.ok) { return false; }
      token = '';
    }
    let response = await fetch(url, { credentials: 'same-origin' });
    return response.ok;
  };
}
