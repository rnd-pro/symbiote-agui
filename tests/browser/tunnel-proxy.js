import { createServer } from 'node:https';
import { request as requestHttp } from 'node:http';
import { connect } from 'node:net';
import { waitForServer, closeServer } from '../../src/shared/server.js';
import { key, cert } from './tunnel-cert.js';

export async function tunnelProxy() {
  /** @type {URL | undefined} */
  let target;
  /** @type {Set<import('node:stream').Duplex>} */
  let sockets = new Set();
  let server = createServer({ key, cert }, (request, response) => {
    if (!target) { response.writeHead(503).end(); return; }
    let upstream = requestHttp(new URL(request.url || '/', target), {
      method: request.method,
      headers: request.headers,
    }, (reply) => {
      response.writeHead(reply.statusCode || 502, reply.headers);
      reply.pipe(response);
    });
    upstream.on('error', () => response.writeHead(502).end());
    request.pipe(upstream);
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (request, socket, head) => {
    if (!target) { socket.destroy(); return; }
    let upstream = connect({ host: target.hostname, port: Number(target.port) }, () => {
      let headers = request.rawHeaders.reduce((lines, value, index) => {
        if (index % 2 === 0) { lines.push(`${value}: ${request.rawHeaders[index + 1]}`); }
        return lines;
      }, /** @type {string[]} */ ([]));
      upstream.write(`GET ${request.url} HTTP/1.1\r\n${headers.join('\r\n')}\r\n\r\n`);
      if (head.length) { upstream.write(head); }
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    sockets.add(upstream);
    upstream.on('close', () => { sockets.delete(upstream); socket.destroy(); });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
  });
  server.listen(0, '127.0.0.1');
  let local = new URL(await waitForServer(server));
  return {
    origin: `https://agui-test.trycloudflare.com:${local.port}`,
    setTarget: (/** @type {string} */ url) => { target = new URL(url); },
    async close() {
      for (let socket of sockets) { socket.destroy(); }
      await closeServer(server);
    },
  };
}
