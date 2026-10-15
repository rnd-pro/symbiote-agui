import { CONNECTION_STATUS_ID, MAX_EVENT_BYTES, RECONNECT_MIN_MS, RECONNECT_MAX_MS, SOCKET_PATH } from '../../transport/constants.js';
import { renderMarkup, updateState } from './render.js';
import { setEventSender } from './events.js';
import { disposeModules } from './modules.js';

export function connectSession() {
  let token = location.hash.slice(1);
  let status = document.getElementById(CONNECTION_STATUS_ID);
  /** @type {WebSocket | undefined} */
  let socket;
  /** @type {number | undefined} */
  let timer;
  let ended = false;
  let paused = false;
  let delay = RECONNECT_MIN_MS;
  let updates = Promise.resolve();

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

  function connect() {
    if (ended || paused) { return; }
    if (!/^[a-f0-9]{64}$/.test(token)) {
      showStatus('Open the complete session URL supplied by AGUI.');
      return;
    }
    let url = new URL(SOCKET_PATH, location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('token', token);
    let current = new WebSocket(url);
    socket = current;
    showStatus('Connecting...');
    current.onopen = () => { delay = RECONNECT_MIN_MS; showStatus(''); };
    current.onmessage = (event) => {
      updates = updates.then(async () => {
        let message = /** @type {import('../../../types/transport.js').ServerMessage} */ (JSON.parse(event.data));
        if (message.type === 'stop') {
          ended = true;
          clearTimeout(timer);
          showStatus('Session ended.');
          await disposeModules();
          return;
        }
        try {
          if (message.type === 'render') {
            await renderMarkup(message);
          } else {
            updateState(message);
          }
          if (current.readyState === WebSocket.OPEN) {
            current.send(JSON.stringify({ type: 'result', id: message.id }));
          }
          showStatus('');
        } catch (error) {
          let detail = error instanceof Error ? error.message : String(error);
          showStatus(`Could not update interface: ${detail}`);
          if (current.readyState === WebSocket.OPEN) {
            current.send(JSON.stringify({ type: 'result', id: message.id, error: detail }));
          }
        }
      }).catch((error) => showStatus(`Connection error: ${error.message}`));
    };
    current.onclose = (event) => {
      if (event.code === 1000 && event.reason === 'Session ended') { ended = true; }
      if (ended) { showStatus('Session ended.'); return; }
      if (paused) { return; }
      showStatus('Connection lost. Reconnecting...');
      timer = window.setTimeout(connect, delay);
      delay = Math.min(delay * 2, RECONNECT_MAX_MS);
    };
  }

  window.addEventListener('pagehide', () => {
    paused = true;
    clearTimeout(timer);
    socket?.close(1000, 'Page hidden');
  });
  window.addEventListener('pageshow', () => {
    if (paused) { paused = false; connect(); }
  });
  connect();
}
