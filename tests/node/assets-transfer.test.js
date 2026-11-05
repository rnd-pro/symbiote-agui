import assert from 'node:assert/strict';
import { mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { assetTransferFixture } from './assets-transfer-fixture.js';
import { transferSession } from '../../src/projects/transfer/service.js';
import { transferAssetPath, transferPaths } from '../../src/projects/transfer/scope.js';
import { snapshotAssetTree, assertAssetManifest, validateAssetManifest } from '../../src/assets/manifest.js';
import { readTransferFiles } from '../../src/projects/transfer/snapshot.js';
import { readReceipt } from '../../src/projects/transfer/receipts.js';
import { listProjectEntries } from '../../src/projects/explorer/list.js';
import { previewProjectFile } from '../../src/projects/explorer/preview.js';
import { readRuntimeCache } from '../../src/data/cache.js';
import { withStorageFolder } from '../../src/config/storage-scope.js';
import { reserveSession, writeSession, releaseScopedSession } from '../../src/sessions/store.js';
import { startControlServer } from '../../src/server/control-server.js';
import { closeServer } from '../../src/shared/server.js';
import { recoverTransfer } from '../../src/projects/transfer/recover.js';

test('copy carries exact nested binary assets and empty directories independently of private data', async (t) => {
  let f = await assetTransferFixture(t);
  let before = await snapshotAssetTree(f.root);
  let result = await transferSession(f.a.id, f.input(f.b.id));
  assert.equal(result.ok, true, result.error?.message);
  let destination = transferAssetPath(f.b, 'desk');
  assertAssetManifest(await snapshotAssetTree(destination), before);
  assert.deepEqual(await readFile(join(destination, 'images/logo mark.png')), f.bytes);
  assert.equal((await stat(join(destination, 'empty'))).isDirectory(), true);
  let files = await readTransferFiles(transferPaths(f.b, 'desk'));
  assert.equal(files.html, f.files.html);
  assert.equal(files.description, f.files.description);
  assert.equal(files.data, null);
  assert.equal(files.metadata, null);
  assertAssetManifest(await snapshotAssetTree(f.root), before);
  assert.equal(result.transfer?.version, 2);
  assert.deepEqual(result.transfer?.assets, before);
  assert.doesNotMatch(JSON.stringify(result.transfer?.assets), /AGUI_STATE|\.cache|base64/);
});

test('Default and project copies keep relative URLs and serve assets after restart', async (t) => {
  let f = await assetTransferFixture(t);
  await f.project.cli([
    'start',
    'desk',
    '--no-open',
  ], f.a.folder);
  let toDefault = await transferSession(f.a.id, f.input(f.defaults.id));
  assert.equal(toDefault.ok, true, toDefault.error?.message);
  let root = transferAssetPath(f.defaults, 'desk');
  assert.match(root, /6465736b\.assets$/);
  let toProject = await transferSession(f.defaults.id, f.input(f.b.id, {
    destinationSessionId: 'copied',
  }));
  assert.equal(toProject.ok, true, toProject.error?.message);
  let page = await f.project.cli([
    'start',
    'copied',
    '--no-open',
  ], f.b.folder);
  let response = await fetch(new URL('_assets/images/logo%20mark.png', page.url));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), f.bytes);
  await f.project.cli([
    'stop',
    'copied',
  ], f.b.folder);
  let restarted = await f.project.cli([
    'start',
    'copied',
    '--no-open',
  ], f.b.folder);
  assert.equal(await (await fetch(new URL('_assets/brief.md', restarted.url))).text(), '# Fixture brief');
});

test('rename moves assets in the same scope without rewriting markup or changing original sources', async (t) => {
  let f = await assetTransferFixture(t);
  let originalData = await readRuntimeCache('desk', f.a.stateRoot);
  let renamed = await f.project.cli([
    'rename',
    'desk',
    'renamed',
  ], f.a.folder);
  assert.equal(renamed.renamed, true);
  await assert.rejects(stat(f.root));
  assert.deepEqual(await readFile(join(transferAssetPath(f.a, 'renamed'), 'images/logo mark.png')), f.bytes);
  assert.equal(await readFile(transferPaths(f.a, 'renamed').html, 'utf8'), f.files.html);
  let renamedData = await readRuntimeCache('renamed', f.a.stateRoot);
  assert.equal(renamedData?.html, originalData?.html);
  assert.equal(renamedData?.sourceHash, originalData?.sourceHash);
  assert.notEqual(renamedData?.revision, originalData?.revision);
});

test('asset-only and case collisions refuse publication; missing virtual dependencies and links fail before copying', async (t) => {
  let f = await assetTransferFixture(t);
  let destination = transferAssetPath(f.b, 'desk');
  await mkdir(destination);
  await assert.rejects(transferSession(f.a.id, f.input(f.b.id)), /already has|conflicting/);
  await rm(destination, {
    recursive: true,
  });
  let collision = join(f.b.folder || '', 'Desk.assets');
  await mkdir(collision);
  await assert.rejects(transferSession(f.a.id, f.input(f.b.id)), /already has|conflicting/);
  await rm(collision, {
    recursive: true,
  });
  await writeFile(transferPaths(f.a, 'desk').html, `${f.files.html}<img src="./_assets/missing.png">`);
  await assert.rejects(transferSession(f.a.id, f.input(f.b.id)), /missing.*dependencies/i);
  await assert.rejects(stat(transferPaths(f.b, 'desk').html));
  await writeFile(transferPaths(f.a, 'desk').html, f.files.html);
  await symlink(transferPaths(f.a, 'desk').html, join(f.root, 'escape.svg'));
  await assert.rejects(transferSession(f.a.id, f.input(f.b.id)), /symbolic links/);
  await assert.rejects(stat(destination));
});

test('Default explorer maps only owned asset directories and retains bounded text previews', async (t) => {
  let f = await assetTransferFixture(t);
  assert.equal((await transferSession(f.a.id, f.input(f.defaults.id))).ok, true);
  let entries = await listProjectEntries('default');
  assert.equal(entries.entries.find((entry) => entry.name === 'desk.assets')?.kind, 'directory');
  let nested = await listProjectEntries('default', 'desk.assets');
  assert.ok(nested.entries.some((entry) => entry.path === 'desk.assets/images' && entry.kind === 'directory'));
  let image = await listProjectEntries('default', 'desk.assets/images');
  assert.equal(image.entries[0].name, 'logo mark.png');
  let preview = await previewProjectFile('default', 'desk.assets/brief.md');
  assert.equal(preview.kind, 'markdown');
  assert.equal(preview.text, '# Fixture brief');
  assert.equal((await previewProjectFile('default', 'desk.assets/images/logo mark.png')).kind, 'unsupported');
  for (let path of [
    'desk.assets/../receipt.json',
    'desk.assets/.private.txt',
    'desk.assets/../../.runtime',
    '.runtime',
  ]) { await assert.rejects(listProjectEntries('default', path, 0, true)); }
  let folderEntries = await listProjectEntries(f.a.id);
  assert.ok(folderEntries.entries.some((entry) => entry.name === 'desk.assets'));
});

test('legacy receipts remain readable and new manifests reject malformed or ambiguous recovery paths', async (t) => {
  let f = await assetTransferFixture(t);
  await rm(f.root, {
    recursive: true,
  });
  await writeFile(transferPaths(f.a, 'desk').html, '<p>Legacy transfer</p>');
  await rm(transferPaths(f.a, 'desk').data);
  let result = await transferSession(f.a.id, f.input(f.b.id));
  assert.ok(result.transfer);
  let receipt = JSON.parse(await readFile(result.transfer.receiptPath, 'utf8'));
  receipt.version = 1;
  delete receipt.assets;
  await writeFile(result.transfer.receiptPath, JSON.stringify(receipt));
  assert.equal((await readReceipt(receipt.id)).version, 1);
  for (let value of [
    {
      directories: [],
      files: [
        {
          path: '../secret.png',
          size: 1,
          sha256: 'a'.repeat(64),
        },
      ],
    },
    {
      directories: [
        'Images',
      ],
      files: [
        {
          path: 'images/logo.png',
          size: 1,
          sha256: 'a'.repeat(64),
        },
      ],
    },
    {
      directories: [],
      files: [
        {
          path: 'logo.png',
          size: 1,
          sha256: 'invalid',
        },
      ],
    },
  ]) { assert.throws(() => validateAssetManifest(value)); }
  for (let root of [
    null,
    false,
    0,
    [],
    {
      dev: 1,
      ino: -1,
    },
  ]) {
    await writeFile(result.transfer.receiptPath, JSON.stringify({
      ...receipt,
      version: 2,
      assets: null,
      assetDestinationRoot: root,
    }));
    await assert.rejects(readReceipt(receipt.id), /directory identity/);
  }
});

test('older live snapshots refuse asset copies, allow asset-free copies, and detect changed asset snapshots', async (t) => {
  let f = await assetTransferFixture(t);
  let record = await withStorageFolder(f.a.folder, () => reserveSession('desk'));
  let manifest = await snapshotAssetTree(f.root);
  /** @type {import('../../types/assets.js').AssetManifest | null | undefined} */
  let capturedAssets;
  let control = await startControlServer(record, () => ({
    sessionId: 'desk',
    state: 'waiting',
  }), async () => {}, {
    transferSnapshot: async () => ({
      sessionId: 'desk',
      state: 'waiting',
      transferSnapshot: {
        files: f.files,
        ...(capturedAssets !== undefined ? {
          assets: capturedAssets,
        } : {}),
      },
    }),
  });
  t.after(async () => {
    await closeServer(control.server);
    await releaseScopedSession(record, f.a.stateRoot);
  });
  record.controlUrl = control.url;
  await withStorageFolder(f.a.folder, () => writeSession(record));
  await assert.rejects(transferSession(f.a.id, f.input(f.b.id)), /cannot capture assets/);
  capturedAssets = manifest;
  await writeFile(join(f.root, 'brief.md'), '# Changed after capture');
  await assert.rejects(transferSession(f.a.id, f.input(f.b.id)), /Assets changed after the worker snapshot/);
  capturedAssets = undefined;
  await rm(f.root, {
    recursive: true,
  });
  f.files.html = f.files.html.replace(/<img[^>]+>$/, '');
  await writeFile(transferPaths(f.a, 'desk').html, f.files.html);
  let result = await transferSession(f.a.id, f.input(f.b.id));
  assert.equal(result.ok, true, result.error?.message);
});

test('version 1 receipts can still recover an interrupted transfer without assets', async (t) => {
  let f = await assetTransferFixture(t);
  await rm(f.root, {
    recursive: true,
  });
  await writeFile(transferPaths(f.a, 'desk').html, '<p>Legacy source</p>');
  await rm(transferPaths(f.a, 'desk').data);
  let result = await transferSession(f.a.id, f.input(f.b.id, {
    kind: 'move',
  }), {
    beforeRemove: async (key) => { if (key === 'description') { throw new Error('Controlled legacy failure.'); } },
  });
  assert.equal(result.ok, false);
  assert.ok(result.transfer);
  let receipt = JSON.parse(await readFile(result.transfer.receiptPath, 'utf8'));
  receipt.version = 1;
  delete receipt.assets;
  await writeFile(result.transfer.receiptPath, JSON.stringify(receipt));
  assert.equal((await recoverTransfer(receipt.id, f.a.stateRoot)).ok, true);
  assert.equal(await readFile(transferPaths(f.a, 'desk').html, 'utf8'), '<p>Legacy source</p>');
  await assert.rejects(stat(transferPaths(f.b, 'desk').html));
});
