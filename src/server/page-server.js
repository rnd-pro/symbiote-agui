import { fileURLToPath } from 'node:url';
import { closeServer, waitForServer } from '../shared/server.js';

export async function startPageServer() {
  let { default: config } = await import('jsda-kit/cfg');
  let { createServer } = await import('jsda-kit/server/JSDAServer.js');
  config.dynamic.baseDir = fileURLToPath(new URL('../page/', import.meta.url));
  config.dynamic.routes = fileURLToPath(new URL('../page/routes.js', import.meta.url));
  config.dynamic.cache.inMemory = false;
  config.minify.html = false;
  config.log = false;

  let server = createServer({ port: { host: '127.0.0.1', port: 0 } });
  let [handler] = server.listeners('request');
  server.removeAllListeners('request');
  server.on('request', (request, response) => {
    if (request.method !== 'GET' || request.url !== '/') {
      response.writeHead(404).end();
      return;
    }

    Promise.resolve(handler?.call(server, request, response)).catch((error) => {
      console.error(error);
      if (!response.headersSent) {
        response.writeHead(500);
      }
      response.end();
    });
  });

  try {
    let url = await waitForServer(server);
    return { server, url: `${url}/` };
  } catch (error) {
    await closeServer(server);
    throw error;
  }
}
