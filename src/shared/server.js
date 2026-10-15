import { once } from 'node:events';

/** @param {import('node:http').Server} server */
export async function waitForServer(server) {
  if (!server.listening) {
    await once(server, 'listening');
  }

  let address = server.address();

  if (!address || typeof address === 'string' || address.address !== '127.0.0.1') {
    throw new Error('Expected a loopback TCP server.');
  }

  return `http://127.0.0.1:${address.port}`;
}

/** @param {import('node:http').Server | undefined} server */
export async function closeServer(server) {
  if (!server?.listening) {
    return;
  }

  let closed = new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve(undefined));
  });

  server.closeAllConnections();
  await closed;
}
