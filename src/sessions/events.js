import { randomUUID } from 'node:crypto';
import { MAX_EVENTS } from '../transport/constants.js';

export class SessionEvents {
  /** @type {import('../../types/transport.js').SessionEvent[]} */
  items = [];
  dropped = 0;

  /** @param {Extract<import('../../types/transport.js').PageMessage, { type: 'event' }>} message */
  add(message) {
    if (this.items.length === MAX_EVENTS) {
      this.items.shift();
      this.dropped += 1;
    }
    this.items.push({ id: randomUUID(), name: message.name, data: message.data ?? null, time: new Date().toISOString() });
  }

  drain() {
    let batch = { events: this.items, dropped: this.dropped };
    this.items = [];
    this.dropped = 0;
    return batch;
  }
}
