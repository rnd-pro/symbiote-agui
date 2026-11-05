import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { temporaryManagerProject } from './manager-storage-fixture.js';
import { writeTransferFixture } from './transfer-fixture.js';
import { dataHtml } from './data-fixture.js';
import { connectProject } from '../../src/projects/registry.js';
import { transferAssetPath, transferScope } from '../../src/projects/transfer/scope.js';

/** @param {import('node:test').TestContext} t */
export async function assetTransferFixture(t) {
  let project = await temporaryManagerProject();
  let directory = await realpath(await mkdtemp(join(tmpdir(), 'agui-asset-projects-')));
  t.after(async () => {
    await project.close();
    await rm(directory, {
      recursive: true,
      force: true,
    });
  });
  let scopes = [];
  for (let name of [
    'a',
    'b',
  ]) {
    let folder = join(directory, name);
    await mkdir(folder);
    scopes.push(await transferScope((await connectProject(folder)).id));
  }
  let a = scopes[0];
  let b = scopes[1];
  let html = `${dataHtml}<img src="./_assets/images/logo%20mark.png" alt="Fixture">`;
  let files = await writeTransferFixture(a, 'desk', html);
  let root = transferAssetPath(a, 'desk');
  await mkdir(join(root, 'images'), {
    recursive: true,
  });
  await mkdir(join(root, 'empty'));
  let bytes = Buffer.from([
    0,
    0xff,
    0xfe,
    0x80,
  ]);
  await writeFile(join(root, 'images/logo mark.png'), bytes);
  await writeFile(join(root, 'brief.md'), '# Fixture brief');
  return {
    project,
    directory,
    a,
    b,
    defaults: await transferScope('default'),
    files,
    bytes,
    root,
    /**
     * @param {string} destinationProjectId
     * @param {Partial<import('../../types/transfer.js').TransferInput>} [options]
     * @returns {import('../../types/transfer.js').TransferInput}
     */
    input(destinationProjectId, options = {}) {
      return {
        kind: 'copy',
        sessionId: 'desk',
        destinationProjectId,
        destinationSessionId: 'desk',
        includeData: false,
        includeMetadata: false,
        ...options,
      };
    },
  };
}
