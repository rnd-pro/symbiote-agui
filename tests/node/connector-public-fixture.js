import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { on, once } from 'node:events';
import { WebSocket } from 'ws';
import { connectorFixture } from './connector-fixture.js';
import { SessionRuntime } from '../../src/sessions/runtime.js';

/**
 * @param {WebSocket} socket
 * @param {string} type
 * @returns {Promise<any>}
 */
export async function publicMessage(socket, type) {
  for await (let [
    data,
  ] of on(socket, 'message', {
    signal: AbortSignal.timeout(10000),
  })) {
    let parsed = JSON.parse(data.toString());
    if (parsed.type === type) { return parsed; }
  }
}

/**
 * @param {import('node:test').TestContext} t
 * @param {string} [origin]
 */
export async function publicConnectorFixture(t, origin = 'https://public.example') {
  let f = await connectorFixture(t);
  await f.attach();
  let runtime = new SessionRuntime({
    sessionId: 'backend',
    instanceId: randomUUID(),
    controlToken: 'a'.repeat(64),
    pid: process.pid,
    launcherPid: process.pid,
  });
  await runtime.start(new AbortController().signal);
  f.cleanup(() => runtime.close());
  assert.ok(runtime.access && runtime.pages && runtime.record.url);
  runtime.access.sharing = true;
  runtime.access.publicOrigin = origin;
  runtime.pages.shared.enable(0);
  let endpoint = new URL(runtime.access.socketPath, runtime.record.url);
  endpoint.protocol = 'ws:';
  /** @param {Partial<import('../../types/connectors.js').ConnectorExposureOptions>} [overrides] */
  let policy = (overrides = {}) => ({
    revision: f.prepared.revision,
    actor: 'fixture-actor',
    origin,
    resources: {
      value: 'allowed',
    },
    expiresInSeconds: 600,
    requestsPerMinute: 120,
    ...overrides,
  });
  return {
    ...f,
    runtime,
    origin,
    policy,
    /** @param {Partial<import('../../types/connectors.js').ConnectorExposureOptions>} [overrides] */
    async expose(overrides) {
      return /** @type {{ id: string; token: string }} */ (await runtime.connectors.configure({
        command: 'expose',
        action: 'save',
        policy: policy(overrides),
      }));
    },
    /**
     * @param {boolean} [viewer]
     * @param {string} [sourceOrigin]
     */
    async connect(viewer = false, sourceOrigin = origin) {
      let url = new URL(endpoint);
      if (viewer) { url.searchParams.set('mode', 'viewer'); }
      let socket = new WebSocket(url, {
        origin: sourceOrigin,
        headers: {
          host: new URL(sourceOrigin).host,
        },
      });
      f.cleanup(() => { socket.terminate(); });
      let ready = viewer ? Promise.resolve() : publicMessage(socket, 'connector-status');
      socket.on('message', (data) => {
        let entry = JSON.parse(data.toString());
        if (entry.type === 'render') { socket.send(JSON.stringify({
          type: 'result',
          id: entry.id,
        })); }
      });
      await once(socket, 'open');
      await ready;
      await runtime.updates;
      return socket;
    },
    /**
     * @param {WebSocket} socket
     * @param {string} token
     */
    async authorize(socket, token) {
      let reply = publicMessage(socket, 'connector-authorized');
      socket.send(JSON.stringify({
        type: 'connector-authorize',
        action: 'save',
        token,
      }));
      return (await reply).accepted;
    },
    /**
     * @param {WebSocket} socket
     * @param {unknown} [input]
     * @param {string} [requestId]
     * @param {boolean} [read]
     */
    async call(socket, input = {
      value: 'allowed',
    }, requestId = randomUUID(), read = false) {
      let reference = {
        action: 'save',
        requestId,
        instanceId: runtime.record.instanceId,
      };
      let reply = publicMessage(socket, 'connector-result');
      socket.send(JSON.stringify(read ? {
        type: 'connector-read',
        reference,
      } : {
        type: 'connector-call',
        call: {
          ...reference,
          markupRevision: runtime.status().connectors?.markupRevision,
          revision: f.prepared.revision,
          input,
        },
      }));
      return (await reply).result;
    },
  };
}
