/** @type {Map<string, string>} */
let tokens = new Map();
/** @type {Map<string, { resolve: (accepted: boolean) => void; timer: number }>} */
let waiting = new Map();
/** @type {(message: string) => boolean} */
let send = () => false;
let connected = false;

/** @param {string} action */
function transmit(action) {
  let token = tokens.get(action);
  return !!token && send(JSON.stringify({
    type: 'connector-authorize',
    action,
    token,
  }));
}

/**
 * @param {string} action
 * @param {boolean} accepted
 */
export function receiveAuthorization(action, accepted) {
  let entry = waiting.get(action);
  if (entry) {
    clearTimeout(entry.timer);
    waiting.delete(action);
    entry.resolve(accepted);
  }
  if (!accepted) { tokens.delete(action); }
}

/** @param {(message: string) => boolean} sender */
export function setAuthorizationSender(sender) { send = sender; }

/** @param {boolean} value */
export function setAuthorizationConnected(value) {
  connected = value;
  if (value) { for (let action of tokens.keys()) { transmit(action); } }
  else { for (let action of waiting.keys()) { receiveAuthorization(action, false); } }
}

/**
 * Keep bearer material outside provider state and mirrored HTML. A successful
 * response means capability authentication, not completion of any operation.
 * @param {string} action
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export function authorizeConnector(action, token) {
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(action) || !/^[A-Za-z0-9_-]{43}$/.test(token) || !connected || waiting.has(action)) {
    return Promise.resolve(false);
  }
  tokens.set(action, token);
  return new Promise((resolve) => {
    let timer = window.setTimeout(() => receiveAuthorization(action, false), 10000);
    waiting.set(action, {
      resolve,
      timer,
    });
    if (!transmit(action)) { receiveAuthorization(action, false); }
  });
}
