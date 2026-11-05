import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { assetTransferFixture } from './assets-transfer-fixture.js';
import { transferSession } from '../../src/projects/transfer/service.js';
import { recoverTransfer } from '../../src/projects/transfer/recover.js';
import { transferAssetPath, transferPaths, quarantinePath } from '../../src/projects/transfer/scope.js';
import { snapshotAssetTree, assertAssetManifest } from '../../src/assets/manifest.js';
import { assetRoot } from '../../src/assets/files.js';
import { readReceipt, receiptDirectory, saveReceipt } from '../../src/projects/transfer/receipts.js';

test('failed move cleanup restores binary assets from private backups with the original private records', async (t) => {
  let f = await assetTransferFixture(t);
  let before = await snapshotAssetTree(f.root);
  let result = await transferSession(f.a.id, f.input(f.b.id, {
    kind: 'move',
  }), {
    beforeRemove: async (key) => { if (key === 'description') { throw new Error('Controlled cleanup failure.'); } },
  });
  assert.equal(result.ok, false);
  assert.ok(result.transfer);
  await assert.rejects(stat(f.root));
  let recovered = await recoverTransfer(result.transfer.id, f.a.stateRoot);
  assert.equal(recovered.ok, true);
  assertAssetManifest(await snapshotAssetTree(f.root), before);
  assert.equal(await readFile(transferPaths(f.a, 'desk').data, 'utf8'), f.files.data);
  await assert.rejects(stat(transferAssetPath(f.b, 'desk')));
  assert.equal((await recoverTransfer(result.transfer.id, f.a.stateRoot)).ok, true);
});

test('changed source assets remain quarantined and are restored without overwriting them with older bytes', async (t) => {
  let f = await assetTransferFixture(t);
  let changed = Buffer.from('new local asset');
  let result = await transferSession(f.a.id, f.input(f.b.id, {
    kind: 'move',
  }), {
    beforeRemove: async (key) => {
      if (key === 'assets') { await writeFile(join(f.root, 'images/logo mark.png'), changed); }
    },
  });
  assert.equal(result.ok, false);
  assert.ok(result.transfer);
  let quarantine = quarantinePath(f.root, result.transfer.id);
  assert.deepEqual(await readFile(join(quarantine, 'images/logo mark.png')), changed);
  assert.deepEqual(await readFile(join(receiptDirectory(result.transfer.id), 'source/assets/images/logo mark.png')), f.bytes);
  assert.equal((await recoverTransfer(result.transfer.id, f.a.stateRoot)).ok, true);
  assert.deepEqual(await readFile(join(f.root, 'images/logo mark.png')), changed);
  await assert.rejects(stat(quarantine));
  await assert.rejects(stat(transferAssetPath(f.b, 'desk')));
});

test('partial publication and changed destination assets stop rollback until explicitly reconciled', async (t) => {
  let f = await assetTransferFixture(t);
  let target = transferPaths(f.b, 'desk');
  let assets = transferAssetPath(f.b, 'desk');
  let result = await transferSession(f.a.id, f.input(f.b.id), {
    beforePublish: async () => { await writeFile(target.html, '<p>Concurrent destination</p>'); },
  });
  assert.equal(result.ok, false);
  assert.ok(result.transfer?.assetDestinationRoot);
  await rm(target.html);
  await writeFile(join(assets, 'brief.md'), 'changed externally');
  await assert.rejects(recoverTransfer(result.transfer.id, f.b.stateRoot), /Asset files changed/);
  assert.equal(await readFile(join(assets, 'brief.md'), 'utf8'), 'changed externally');
  await writeFile(join(assets, 'brief.md'), '# Fixture brief');
  assert.equal((await recoverTransfer(result.transfer.id, f.b.stateRoot)).ok, true);
  await assert.rejects(stat(assets));
  assert.deepEqual(await readFile(join(f.root, 'images/logo mark.png')), f.bytes);
});

test('a directory created by another writer is neither merged nor removed during recovery', async (t) => {
  let f = await assetTransferFixture(t);
  let target = transferAssetPath(f.b, 'desk');
  let result = await transferSession(f.a.id, f.input(f.b.id), {
    beforePublish: async () => { await mkdir(target); },
  });
  assert.equal(result.ok, false);
  assert.ok(result.transfer);
  assert.equal(result.transfer.assetDestinationRoot, undefined);
  await assert.rejects(recoverTransfer(result.transfer.id, f.a.stateRoot), /ownership/);
  assert.equal((await stat(target)).isDirectory(), true);
  await rm(target, {
    recursive: true,
  });
  assert.equal((await recoverTransfer(result.transfer.id, f.a.stateRoot)).ok, true);
});

test('interrupted asset restoration resumes only inside the recorded root and preserves existing verified files', async (t) => {
  let f = await assetTransferFixture(t);
  let result = await transferSession(f.a.id, f.input(f.b.id, {
    kind: 'move',
  }), {
    beforeRemove: async (key) => { if (key === 'description') { throw new Error('Controlled failure.'); } },
  });
  assert.ok(result.transfer);
  let receipt = await readReceipt(result.transfer.id);
  await mkdir(f.root);
  await copyFile(join(receiptDirectory(receipt.id), 'source/assets/brief.md'), join(f.root, 'brief.md'));
  let root = await assetRoot(f.root);
  assert.ok(root);
  receipt.assetRestoredRoot = {
    dev: root.dev,
    ino: root.ino,
  };
  receipt.assetRestoredManifest = receipt.assets;
  await saveReceipt(receipt);
  assert.equal((await recoverTransfer(receipt.id, f.a.stateRoot)).ok, true);
  assertAssetManifest(await snapshotAssetTree(f.root), receipt.assets ?? null);
  assert.equal((await stat(join(f.root, 'empty'))).isDirectory(), true);
});

test('recovery validates backups before changing destinations and restores partially removed quarantine trees', async (t) => {
  let f = await assetTransferFixture(t);
  let result = await transferSession(f.a.id, f.input(f.b.id, {
    kind: 'move',
  }), {
    beforeRemove: async (key) => { if (key === 'description') { throw new Error('Controlled cleanup failure.'); } },
  });
  assert.ok(result.transfer);
  let receipt = result.transfer;
  let backup = join(receiptDirectory(receipt.id), 'source/assets/images/logo mark.png');
  let target = transferAssetPath(f.b, 'desk');
  // Model interruption during deletion and publication, leaving verified subsets.
  let quarantine = quarantinePath(f.root, receipt.id);
  await mkdir(quarantine);
  await writeFile(join(quarantine, 'brief.md'), '# Fixture brief');
  await rm(join(target, 'brief.md'));
  await writeFile(backup, 'corrupted backup');
  await assert.rejects(recoverTransfer(receipt.id, f.a.stateRoot), /backup is missing or changed/);
  assert.deepEqual(await readFile(join(target, 'images/logo mark.png')), f.bytes);
  await assert.rejects(stat(f.root));
  await writeFile(backup, f.bytes);
  assert.equal((await recoverTransfer(receipt.id, f.a.stateRoot)).ok, true);
  assertAssetManifest(await snapshotAssetTree(f.root), receipt.assets ?? null);
  await assert.rejects(stat(target));
  await assert.rejects(stat(quarantine));
});
