import { createServer } from 'node:http';
import { assetFixture } from './assets-fixture.js';
import { LocalAssets } from '../../src/assets/http-server.js';
import { definitionPaths } from '../../src/library/paths.js';
import { closeServer, waitForServer } from '../../src/shared/server.js';

/**
 * @param {import('node:test').TestContext} t
 * @param {import('../../types/assets.js').AssetHttpDependencies} [dependencies]
 */
export async function assetHttpFixture(t, dependencies = {}) {
  let files = await assetFixture();
  await files.run([
    'add',
    'desk',
    '--file',
    files.source,
  ]);
  let directory = definitionPaths('desk').assetsPath;
  let access = {
    path: '/desk/',
    socketPath: '/desk/socket',
    publicOrigin: 'https://shared.test',
  };
  let assets = new LocalAssets(access, directory, dependencies);
  await assets.initialize();
  let origin = '';
  let server = createServer((request, response) => {
    if (assets.matches(request.url)) { void assets.serve(request, response, origin); }
    else { response.writeHead(404).end(); }
  });
  server.listen(0, '127.0.0.1');
  origin = await waitForServer(server);
  t.after(async () => {
    await assets.close();
    await closeServer(server);
    await files.close();
  });
  return {
    ...files,
    directory,
    assets,
    access,
    origin,
    url(name = 'logo.svg') {
      return new URL(`${assets.prefix}${name}`, origin);
    },
  };
}
