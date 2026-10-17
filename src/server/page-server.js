import { fileURLToPath } from 'node:url';
import { closeServer, waitForServer } from '../shared/server.js';
import { createStyles } from '../markup/styles.js';
import { STYLESHEET_PATH, CLIENT_SCRIPT_PATH } from '../markup/constants.js';

/** @param {import('../../types/session.js').PageAccess} access */
export async function startPageServer(access) {
  let styles = await createStyles();
  let { default: config } = await import('jsda-kit/cfg');
  let { createServer } = await import('jsda-kit/server/JSDAServer.js');
  config.dynamic.baseDir = fileURLToPath(new URL('../page/', import.meta.url));
  config.dynamic.routes = fileURLToPath(new URL('../page/routes.js', import.meta.url));
  config.dynamic.cache.inMemory = false;
  config.minify.html = false;
  config.minify.css = false;
  config.minify.js = false;
  config.log = false;

  let server = createServer({ port: { host: '127.0.0.1', port: 0 } });
  let origin = '';
  let [handler] = server.listeners('request');
  server.removeAllListeners('request');
  server.on('request', (request, response) => {
    let pathname = request.url?.split('?')[0];
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (request.method === 'GET' && pathname === access.path.slice(0, -1)) {
      response.writeHead(308, { location: access.path }).end();
      return;
    }
    if (request.method !== 'GET' || ![access.path, STYLESHEET_PATH, CLIENT_SCRIPT_PATH].includes(pathname || '')) {
      response.writeHead(404).end();
      return;
    }

    if (pathname === access.path) { request.url = '/'; }

    Promise.resolve(handler?.call(server, request, response)).catch((error) => {
      console.error(error);
      if (!response.headersSent) {
        response.writeHead(500);
      }
      response.end();
    });
  });

  try {
    origin = await waitForServer(server);
    return { server, url: `${origin}${access.path}`, styles };
  } catch (error) {
    await closeServer(server);
    throw error;
  }
}
