import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { temporaryState } from './state-fixture.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { parseCommand } from '../../src/cli/parse.js';
import { runAssetCommand } from '../../src/assets/service.js';

export async function assetFixture() {
  let state = await temporaryState();
  let pending = await prepareCachedMarkup('desk', '<p>Asset fixture</p>');
  try { await pending.commit(); }
  finally { await pending.discard(); }
  let source = join(state.directory, 'logo.svg');
  let bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>\n');
  await writeFile(source, bytes);
  return {
    ...state,
    source,
    bytes,
    /** @param {string[]} args */
    async run(args) {
      let request = parseCommand([
        'assets',
        ...args,
      ]);
      if (request.kind !== 'assets') { throw new Error('Expected an asset command.'); }
      return runAssetCommand(request);
    },
  };
}
