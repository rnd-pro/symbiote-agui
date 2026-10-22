import { CONNECTION_STATUS_ID, MAX_EVENT_BYTES, RECONNECT_MIN_MS, RECONNECT_MAX_MS, SOCKET_PATH, PAGE_ROLE } from '../../transport/constants.js';
import { executePageCommand, sendPageResult } from './commands.js';
import { setEventSender } from './events.js';
import { disposeModules } from './modules.js';
import { CONTENT_ROOT_ID } from '../../markup/constants.js';
import { replaceContent } from './replace-content.js';
import { SharedView } from './shared-view.js';
import { syncPageIdentity } from './identity.js';
import { setFeedbackSender, setFeedbackConnected, setFeedbackRole, receiveFeedback } from './feedback.js';
import { withoutFeedback } from './feedback-guard.js';

export function connectSession() {
  syncPageIdentity();
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
  let shared = new SharedView((message) => {
    if (socket?.readyState !== WebSocket.OPEN || socket.bufferedAmount > MAX_EVENT_BYTES) { return false; }
    socket.send(message);
    return true;
  }, (message) => showStatus(message));

  /** @param {string} message */
  function showStatus(message) {
    message ||= shared.label();
    if (status) {
      status.textContent = message;
      status.hidden = !message;
    }
  }

  /** @param {string} message */
  let send = (message) => {
    if (shared.role === PAGE_ROLE.VIEWER || socket?.readyState !== WebSocket.OPEN || socket.bufferedAmount > MAX_EVENT_BYTES) { return false; }
    socket.send(message);
    return true;
  };
  setEventSender(send);
  setFeedbackSender(send);

  function connect() {
    if (ended || paused) { return; }
    let attempt = ++generation;
    showStatus('Connecting...');
    let url = new URL(SOCKET_PATH, location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url.hash = '';
    url.search = '';
    let mode = new URL(location.href).searchParams.get('mode');
    if (['user', 'viewer'].includes(mode || '')) { url.searchParams.set('mode', mode || ''); }
    let current = new WebSocket(url);
    socket = current;
    showStatus('Connecting...');
    current.onopen = () => {
      setFeedbackConnected(true);
      delay = RECONNECT_MIN_MS;
      syncPageIdentity();
      current.send(JSON.stringify({ type: 'hello', title: document.title }));
      showStatus('');
    };
    current.onmessage = (event) => {
      if (current !== socket || attempt !== generation) { return; }
      let message;
      try { message = /** @type {import('../../../types/transport.js').ServerMessage} */ (JSON.parse(event.data)); }
      catch { showStatus('Connection error: invalid server message.'); return; }
      if (message.type === 'feedback-status' || message.type === 'feedback-result') {
        withoutFeedback(() => receiveFeedback(message));
        return;
      }
      updates = updates.then(async () => {
        if (current !== socket || attempt !== generation) { return; }
        if (message.type === 'role') {
          setFeedbackRole(message.role);
          await shared.setRole(message);
          showStatus('');
          return;
        }
        if (message.type === 'snapshot') {
          shared.display(message);
          return;
        }
        if (message.type === 'stop') {
          setFeedbackConnected(false);
          ended = true;
          shared.disconnect();
          clearTimeout(timer);
          showStatus('Session ended.');
          try {
            await disposeModules();
          } finally {
            let root = document.getElementById(CONTENT_ROOT_ID);
            if (root) { replaceContent(root, document.createDocumentFragment()); }
            syncPageIdentity();
          }
          return;
        }
        try {
          if (shared.role === PAGE_ROLE.VIEWER) { throw new Error('This page is a read-only viewer.'); }
          if (message.type === 'render') { shared.rendered = true; }
          let result = await executePageCommand(message);
          if (message.type === 'render') { shared.revision = message.revision; }
          shared.publish();
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
      if (current === socket) { shared.disconnect(); setFeedbackConnected(false); }
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

  window.addEventListener('pagehide', () => {
    setFeedbackConnected(false);
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
