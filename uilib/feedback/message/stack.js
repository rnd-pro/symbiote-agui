/** @type {Set<import('./message.js').Message>} */
let messages = new Set();

export function positionMessages() {
  let offset = 0;
  for (let message of [
    ...messages,
  ].reverse()) {
    message.style.setProperty('--agui-message-offset', `${offset}px`);
    offset += message.getBoundingClientRect().height + 8;
  }
}

/** @param {import('./message.js').Message} message */
export function addMessage(message) {
  messages.delete(message);
  messages.add(message);
  positionMessages();
}

/** @param {import('./message.js').Message} message */
export function removeMessage(message) {
  messages.delete(message);
  positionMessages();
}
