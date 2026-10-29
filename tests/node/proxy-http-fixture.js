import { IncomingMessage, createServer, request } from 'node:http';
import { Socket } from 'node:net';
import { AssetProxy } from '../../src/proxy/asset-proxy.js';
import { closeServer, waitForServer } from '../../src/shared/server.js';
import { emptyProxyPolicy } from '../../src/proxy/policy.js';

/**
 * @param {URL} url
 * @param {{ method?: string; headers?: Record<string, string>; body?: string }} [options]
 * @returns {Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: string }>}
 */
export function requestProxy(url, options = {}) {
  return new Promise((resolve, reject) => {
    let outgoing = request(url, options, (incoming) => {
      /** @type {Buffer[]} */
      let chunks = [];
      incoming.on('data', (chunk) => chunks.push(chunk));
      incoming.on('error', reject);
      incoming.on('end', () => resolve({
        status: incoming.statusCode || 0,
        headers: incoming.headers,
        body: Buffer.concat(chunks).toString(),
      }));
    });
    outgoing.on('error', reject);
    outgoing.end(options.body);
  });
}

/**
 * @param {string | Buffer | Buffer[]} [body]
 * @param {import('node:http').IncomingHttpHeaders} [headers]
 * @param {number} [status]
 * @param {boolean} [complete]
 */
export function upstreamResponse(body = 'asset', headers = {
  'content-type': 'text/plain; charset=utf-8',
}, status = 200, complete = true) {
  let message = new IncomingMessage(new Socket());
  message.statusCode = status;
  message.headers = headers;
  message.complete = complete;
  for (let chunk of Array.isArray(body) ? body : [
    body,
  ]) { message.push(Buffer.from(chunk)); }
  if (complete) { message.push(null); }
  return message;
}

/**
 * @param {AbortSignal} signal
 * @returns {Promise<never>}
 */
export function waitForAbort(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });
}

/**
 * @param {import('node:test').TestContext} t
 * @param {import('../../types/proxy.js').ProxyDependencies} [dependencies]
 * @param {import('../../types/proxy.js').ProxyPolicy} [initialPolicy]
 */
export async function proxyFixture(t, dependencies = {}, initialPolicy = {
  version: 1,
  allowedOrigins: [
    'https://assets.test',
    'https://next.test',
    'http://assets.test',
  ],
}) {
  let policy = initialPolicy;
  let access = {
    path: '/desk/',
    socketPath: '/desk/socket',
    publicOrigin: 'https://shared.test',
  };
  let proxy = new AssetProxy(access, () => policy, {
    resolve: async () => [
      {
        address: '93.184.215.14',
        family: 4,
      },
    ],
    open: async () => upstreamResponse(),
    ...dependencies,
  });
  let origin = '';
  let server = createServer((request, response) => { void proxy.serve(request, response, origin); });
  server.listen(0, '127.0.0.1');
  origin = await waitForServer(server);
  t.after(async () => {
    await proxy.close();
    await closeServer(server);
  });
  return {
    proxy,
    origin,
    access,
    url(target = 'https://assets.test/data') {
      let endpoint = new URL('/desk/_proxy', origin);
      endpoint.searchParams.set('url', target);
      return endpoint;
    },
    disable() {
      policy = emptyProxyPolicy();
      proxy.refreshPolicy();
    },
  };
}
