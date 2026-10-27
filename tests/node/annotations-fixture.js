import { WebSocket } from 'ws';
import { PageAnnotations } from '../../src/server/page-annotations.js';

export function annotationsFixture() {
  let time = 1_000;
  /** @type {Map<string, import('../../types/tools.js').PagePeer>} */
  let pages = new Map();
  let annotations = new PageAnnotations(pages, () => time);
  annotations.setView(1, [
    'fixture-anchor',
  ]);

  return {
    annotations,
    pages,
    advance(/** @type {number} */ ms) { time += ms; annotations.sweep(); },
    add(/** @type {import('../../types/transport.js').PageRole} */ role = 'viewer') {
      /** @type {import('../../types/transport.js').AnnotationServerMessage[]} */
      let messages = [];
      let socket = /** @type {WebSocket} */ (/** @type {unknown} */ ({
        readyState: WebSocket.OPEN,
        bufferedAmount: 0,
        send(/** @type {string} */ data) { messages.push(JSON.parse(data)); },
      }));
      let page = {
        socket,
        title: 'Annotation fixture',
        ready: true,
        role,
      };
      pages.set(String(pages.size), page);
      annotations.connect(page);
      let sequence = 0;
      return {
        page,
        messages,
        send(/** @type {Record<string, unknown>} */ input) {
          let packet = {
            type: 'annotation',
            revision: annotations.revision,
            sequence: ++sequence,
            viewSequence: annotations.viewSequence,
            ...input,
          };
          return annotations.receive(page, packet, Buffer.byteLength(JSON.stringify(packet)));
        },
        state() {
          annotations.sendState(page);
          let message = messages.at(-1);
          if (message?.action !== 'state') { throw new Error('Expected annotation state.'); }
          return message;
        },
      };
    },
  };
}

export function annotationPoint() {
  return {
    anchor: 'fixture-anchor',
    x: 0.25,
    y: 0.5,
  };
}
