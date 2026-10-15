import { MAX_EVENT_BYTES } from '../../transport/constants.js';

/** @type {(message: string) => boolean} */
let send = () => false;

/** @param {(message: string) => boolean} sender */
export function setEventSender(sender) {
  send = sender;
}

/**
 * @param {string} name
 * @param {unknown} [data]
 */
export function emit(name, data = null) {
  if (!name || name.length > 128) { throw new Error('Event names require 1-128 characters.'); }
  let message = JSON.stringify({ type: 'event', name, data });
  if (new TextEncoder().encode(message).byteLength > MAX_EVENT_BYTES) {
    throw new Error('Event payload exceeds 16 KiB.');
  }
  return send(message);
}
