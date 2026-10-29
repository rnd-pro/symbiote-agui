import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { transferPaths } from '../../src/projects/transfer/scope.js';
import { TRANSFER_FILE_KEYS } from '../../src/projects/transfer/constants.js';
import { patchData } from '../../src/data/markup.js';
import { runtimeCacheText } from '../../src/data/cache.js';
import { dataHtml } from './data-fixture.js';
import { sampleMetadata } from './metadata-fixture.js';

/**
 * @param {import('../../types/transfer.js').TransferScope} scope
 * @param {string} [id]
 * @param {string} [html]
 */
export async function writeTransferFixture(scope, id = 'desk', html = dataHtml) {
  let paths = transferPaths(scope, id);
  let files = {
    proxy: JSON.stringify({
      version: 1,
      allowedOrigins: [
        'https://example.test',
      ],
    }),
    html,
    description: '# Example desk\n\nPurpose and data-flow rules remain unchanged.\n',
    metadata: JSON.stringify(sampleMetadata()),
    data: runtimeCacheText(patchData(html, [
      {
        provider: 'APP',
        values: {
          records: [
            {
              id: 'committed',
            },
          ],
        },
      },
    ]), html, randomUUID()),
  };
  for (let key of TRANSFER_FILE_KEYS) {
    await mkdir(dirname(paths[key]), {
      recursive: true,
    });
    await writeFile(paths[key], files[key]);
  }
  return files;
}
