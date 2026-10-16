import { renderMarkup, updateState } from './render.js';
import { ToolBridge } from './tool-bridge.js';
import { MAX_PAGE_MESSAGE_BYTES } from '../../transport/constants.js';

let tools = new ToolBridge();

/** @param {import('../../../types/transport.js').PageCommand} command */
export async function executePageCommand(command) {
  if (command.type === 'render') {
    tools.invalidate();
    await renderMarkup(command);
  } else if (command.type === 'update') {
    updateState(command);
  } else if (command.type === 'tools') {
    return tools.discover();
  } else {
    return tools.execute(command);
  }
}

/**
 * @param {WebSocket} socket
 * @param {string} id
 * @param {unknown} [result]
 * @param {string} [error]
 */
export function sendPageResult(socket, id, result, error) {
  if (socket.readyState !== WebSocket.OPEN) { return; }
  let message;
  try {
    message = JSON.stringify({ type: 'result', id, result: result ?? null, error });
    if (new TextEncoder().encode(message).byteLength > MAX_PAGE_MESSAGE_BYTES) {
      throw new Error('The page result exceeds 1 MiB. The action may have completed; do not retry automatically.');
    }
  } catch (failure) {
    let detail = failure instanceof Error ? failure.message : String(failure);
    message = JSON.stringify({ type: 'result', id, error: `Could not serialize result: ${detail}. The action may have completed; do not retry automatically.` });
  }
  socket.send(message);
}
