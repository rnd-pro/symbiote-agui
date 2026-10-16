import { CONNECTION_STATUS_ID, MAX_EVENT_BYTES, RECONNECT_MIN_MS, RECONNECT_MAX_MS, SOCKET_PATH, PAGE_TOKEN_PATTERN } from '../../transport/constants.js';
import { executePageCommand, sendPageResult } from './commands.js';
import { setEventSender } from './events.js';
import { disposeModules } from './modules.js';
import { CONTENT_ROOT_ID } from '../../markup/constants.js';
import { replaceContent } from './replace-content.js';
import { createAuthorization } from './authorization.js';

export function connectSession() {
  let authorize = createAuthorization();
  let status = document.getElementById(CONNECTION_STATUS_ID);
  /** @type {WebSocket | undefined} */
  let socket;
  /** @type {number | undefined} */
  let timer;
  let ended = false;
  let paused = false;
  let delay = RECONNECT_MIN_MS;
  let updates = Promise.resolve();
  let generation = 0;

  /** @param {string} message */
  function showStatus(message) {
    if (status) {
      status.textContent = message;
      status.hidden = !message;
    }
  }

  setEventSender((message) => {
    if (socket?.readyState !== WebSocket.OPEN || socket.bufferedAmount > MAX_EVENT_BYTES) { return false; }
    socket.send(message);
    return true;
  });

  async function connect() {
    if (ended || paused) { return; }
    let attempt = ++generation;
    showStatus('Connecting...');
    try {
      let authorized = await authorize();
      if (ended || paused || attempt !== generation) { return; }
      if (!authorized) {
        let sessionId = location.pathname.split('/')[1];
        showStatus(`Browser authorization required. Run npx symbiote-agui status ${sessionId} --authorize and open authorizationUrl.`);
        return;
      }
    } catch {
      if (ended || paused || attempt !== generation) { return; }
      showStatus('Connection lost. Reconnecting...');
      scheduleReconnect();
      return;
    }
    let url = new URL(SOCKET_PATH, location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url.hash = '';
    url.search = '';
    let current = new WebSocket(url);
    socket = current;
    showStatus('Connecting...');
    current.onopen = () => {
      delay = RECONNECT_MIN_MS;
      current.send(JSON.stringify({ type: 'hello', title: document.title }));
      showStatus('');
    };
    current.onmessage = (event) => {
      updates = updates.then(async () => {
        let message = /** @type {import('../../../types/transport.js').ServerMessage} */ (JSON.parse(event.data));
        if (message.type === 'stop') {
          ended = true;
          clearTimeout(timer);
          showStatus('Session ended.');
          try {
            await disposeModules();
          } finally {
            let root = document.getElementById(CONTENT_ROOT_ID);
            if (root) { replaceContent(root, document.createDocumentFragment()); }
          }
          return;
        }
        try {
          let result = await executePageCommand(message);
          sendPageResult(current, message.id, result);
          showStatus('');
        } catch (error) {
          let detail = error instanceof Error ? error.message : String(error);
          showStatus(`Could not update interface: ${detail}`);
          sendPageResult(current, message.id, undefined, detail);
        }
      }).catch((error) => showStatus(`Connection error: ${error.message}`));
    };
    current.onclose = (event) => {
      if (event.code === 1000 && event.reason === 'Session ended') { ended = true; }
      if (ended) { showStatus('Session ended.'); return; }
      if (paused || attempt !== generation) { return; }
      showStatus('Connection lost. Reconnecting...');
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    timer = window.setTimeout(connect, delay);
    delay = Math.min(delay * 2, RECONNECT_MAX_MS);
  }

  window.addEventListener('hashchange', () => {
    if (!PAGE_TOKEN_PATTERN.test(location.hash.slice(1))) { return; }
    clearTimeout(timer);
    socket?.close(1000, 'Authorizing');
    connect();
  });

  window.addEventListener('pagehide', () => {
    paused = true;
    generation += 1;
    clearTimeout(timer);
    socket?.close(1000, 'Page hidden');
  });
  window.addEventListener('pageshow', () => {
    if (paused) { paused = false; connect(); }
  });
  connect();
}
