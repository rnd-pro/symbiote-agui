import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rm, stat, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { temporaryManagerProject } from './manager-storage-fixture.js';
import { transferSession } from '../../src/projects/transfer/service.js';
import { recoverTransfer } from '../../src/projects/transfer/recover.js';
import { transferScope, transferPaths } from '../../src/projects/transfer/scope.js';
import { readReceipt, transferHistory } from '../../src/projects/transfer/receipts.js';
import { connectProject } from '../../src/projects/registry.js';
import { readTransferFiles } from '../../src/projects/transfer/snapshot.js';
import { writeTransferFixture as save } from './transfer-fixture.js';
import { withSessionLock, transferMarkerPath } from '../../src/sessions/storage-lock.js';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';

/** @param {import('node:test').TestContext} t */
async function fixture(t) {
  let project = await temporaryManagerProject();
  t.after(() => project.close());
  let a = join(project.projectDirectory, 'a');
  let b = join(project.projectDirectory, 'b');
  await mkdir(a);
  await mkdir(b);
  let first = await connectProject(a);
  let second = await connectProject(b);
  return {
    project,
    a: await transferScope(first.id),
    b: await transferScope(second.id),
    defaults: await transferScope('default'),
  };
}

/**
 * @param {string} destinationProjectId
 * @param {Partial<import('../../types/transfer.js').TransferInput>} [options]
 * @returns {import('../../types/transfer.js').TransferInput}
 */
function input(destinationProjectId, options = {}) {
  return {
    kind: 'copy',
    sessionId: 'desk',
    destinationProjectId,
    destinationSessionId: 'desk',
    includeData: false,
    includeMetadata: false,
    ...options,
  };
}

test('copy transfers definitions between folders and Default, explicitly includes artifacts and leaves destinations stopped', async (t) => {
  let {
    project,
    a,
    b,
    defaults,
  } = await fixture(t);
  let original = await save(a);
  let plain = await transferSession(a.id, input(b.id));
  assert.equal(plain.ok, true, plain.error?.message);
  let copied = await readTransferFiles(transferPaths(b, 'desk'));
  assert.equal(copied.proxy, original.proxy);
  assert.equal(copied.html, original.html);
  assert.equal(copied.description, original.description);
  assert.equal(copied.metadata, null);
  assert.equal(copied.data, null);
  let included = await transferSession(a.id, input(defaults.id, {
    destinationSessionId: 'included',
    includeData: true,
    includeMetadata: true,
  }));
  assert.equal(included.ok, true, included.error?.message);
  let withData = await readTransferFiles(transferPaths(defaults, 'included'));
  assert.equal(withData.metadata, original.metadata);
  assert.match(withData.data || '', /committed/);
  assert.notEqual(withData.data, original.data, 'The destination gets a fresh data revision.');
  assert.deepEqual(await readTransferFiles(transferPaths(a, 'desk')), original);
  let status = await project.cli([
    'status',
    'included',
  ], '');
  assert.equal(status.active, false);
  let back = await transferSession(defaults.id, input(b.id, {
    sessionId: 'included',
    destinationSessionId: 'from-default',
    includeData: true,
  }));
  assert.equal(back.ok, true, back.error?.message);
  let started = await project.cli([
    'start',
    'from-default',
    '--no-open',
  ], b.folder);
  assert.equal(started.restored, true);
  assert.equal((await project.cli([
    'status',
    'from-default',
  ], b.folder)).active, true);
});

test('transfer history remains readable for receipts written before proxy policies', async (t) => {
  let {
    a,
    b,
  } = await fixture(t);
  await save(a);
  await rm(transferPaths(a, 'desk').proxy);
  let copied = await transferSession(a.id, input(b.id));
  assert.equal(copied.ok, true);
  assert.ok(copied.transfer);
  let path = copied.transfer.receiptPath;
  let legacy = JSON.parse(await readFile(path, 'utf8'));
  delete legacy.sourceHashes.proxy;
  delete legacy.destinationHashes.proxy;
  await writeFile(path, JSON.stringify(legacy));
  let receipt = await readReceipt(copied.transfer.id);
  assert.equal(receipt.sourceHashes.proxy, null);
  assert.equal(receipt.destinationHashes.proxy, null);
  assert.equal((await transferHistory(a.stateRoot))[0].state, 'complete');
});

test('move verifies the destination before removing source files and retains excluded committed data privately', async (t) => {
  let {
    a,
    defaults,
  } = await fixture(t);
  let original = await save(a);
  let moved = await transferSession(a.id, input(defaults.id, {
    kind: 'move',
    destinationSessionId: 'moved',
  }));
  assert.equal(moved.ok, true, moved.error?.message);
  assert.deepEqual(await readTransferFiles(transferPaths(a, 'desk')), {
    proxy: null,
    html: null,
    description: null,
    metadata: null,
    data: null,
  });
  assert.ok(moved.transfer);
  assert.equal(await readFile(join(moved.transfer.backupPath, 'data'), 'utf8'), original.data);
  assert.equal(await readFile(join(moved.transfer.backupPath, 'metadata'), 'utf8'), original.metadata);
  assert.equal((await readTransferFiles(transferPaths(defaults, 'moved'))).data, null);
  assert.equal((await transferHistory(a.stateRoot))[0].state, 'complete');
});

test('transfers reject collisions, same identities, missing dependencies and active moves while live copies use serialized snapshots', async (t) => {
  let {
    project,
    a,
    b,
  } = await fixture(t);
  let original = await save(a);
  await assert.rejects(transferSession(a.id, input(a.id)), /another project/);
  await writeFile(transferPaths(b, 'Desk').html, '<h1>Keep existing case variant</h1>');
  await assert.rejects(transferSession(a.id, input(b.id)), /conflicting name|Choose another ID/);
  await rm(transferPaths(b, 'Desk').html);
  await writeFile(transferPaths(a, 'desk').html, original.html + '<img src="./missing.png">');
  await assert.rejects(transferSession(a.id, input(b.id)), /missing project-relative/);
  await writeFile(transferPaths(a, 'desk').html, original.html);
  let started = await project.cli([
    'start',
    'desk',
    '--no-open',
  ], a.folder);
  let beforeCopy = await project.cli([
    'status',
    'desk',
  ], a.folder);
  await assert.rejects(transferSession(a.id, input(b.id, {
    kind: 'move',
  })), /stop it before moving/);
  let copied = await transferSession(a.id, input(b.id, {
    includeData: true,
  }));
  assert.equal(copied.ok, true, copied.error?.message);
  let current = await project.cli([
    'status',
    'desk',
  ], a.folder);
  assert.equal(current.url, started.url);
  assert.equal(current.pid, beforeCopy.pid);
  assert.equal(current.feedback.instanceId, started.feedback.instanceId);
  assert.equal(await readFile(transferPaths(a, 'desk').html, 'utf8'), original.html);
  await assert.rejects(transferSession(a.id, input(b.id)), /already has/);
});

test('partial publication keeps existing files and a durable receipt; explicit recovery refuses changed destinations', async (t) => {
  let {
    a,
    b,
  } = await fixture(t);
  let original = await save(a);
  let result = await transferSession(a.id, input(b.id, {
    includeMetadata: true,
  }), {
    beforePublish: async () => { await writeFile(transferPaths(b, 'desk').html, 'Concurrent destination content.'); },
  });
  assert.equal(result.ok, false);
  assert.ok(result.transfer?.recoveryRequired);
  let receipt = result.transfer;
  assert.ok(receipt);
  assert.equal(await readFile(transferPaths(b, 'desk').html, 'utf8'), 'Concurrent destination content.');
  await assert.rejects(withSessionLock('desk', async () => {}, b.stateRoot), /unfinished transfer/);
  await assert.rejects(recoverTransfer(receipt.id, a.stateRoot), /Destination html changed/);
  assert.deepEqual(await readTransferFiles(transferPaths(a, 'desk')), original);
  await rm(transferPaths(b, 'desk').html);
  let recovered = await recoverTransfer(receipt.id, b.stateRoot);
  assert.equal(recovered.transfer?.state, 'rolled-back');
  assert.equal((await readTransferFiles(transferPaths(b, 'desk'))).metadata, null);
  await assert.rejects(stat(transferMarkerPath('desk', b.stateRoot)));
});

test('partial move cleanup restores missing source files from backups and never repeats uncertain mutations', async (t) => {
  let {
    a,
    b,
  } = await fixture(t);
  let original = await save(a);
  let result = await transferSession(a.id, input(b.id, {
    kind: 'move',
    includeData: true,
    includeMetadata: true,
  }), {
    beforeRemove: async (key) => { if (key === 'description') { throw new Error('Fixture cleanup failure.'); } },
  });
  assert.equal(result.ok, false);
  assert.ok(result.transfer);
  assert.equal((await readTransferFiles(transferPaths(a, 'desk'))).data, null);
  assert.match((await readTransferFiles(transferPaths(b, 'desk'))).data || '', /committed/);
  await assert.rejects(transferSession(a.id, input(b.id)), /unfinished transfer/);
  assert.equal((await transferHistory(b.stateRoot))[0].recoveryRequired, true);
  let recovered = await recoverTransfer(result.transfer.id, a.stateRoot);
  assert.equal(recovered.ok, true);
  assert.deepEqual(await readTransferFiles(transferPaths(a, 'desk')), original);
  assert.equal((await readTransferFiles(transferPaths(b, 'desk'))).html, null);
  assert.equal((await recoverTransfer(result.transfer.id, a.stateRoot)).ok, true, 'Explicit recovery is idempotent.');
});

test('conflicting transfers serialize and request IDs bind inclusion options and destinations', async (t) => {
  let {
    defaults,
    b,
  } = await fixture(t);
  await save(defaults);
  let operations = new ManagerOperations();
  let request = {
    id: randomUUID(),
    operation: /** @type {const} */ ('copy session'),
    sessionId: 'desk',
    destinationProjectId: b.id,
    destinationSessionId: 'desk',
    includeData: false,
    includeMetadata: false,
    confirm: true,
  };
  let results = await Promise.all([
    operations.dispatch(request),
    operations.dispatch(request),
    operations.dispatch({
      ...request,
      id: randomUUID(),
    }),
  ]);
  assert.equal(results[0].ok, true, results[0].error?.message);
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[2].ok, false);
  assert.equal((await operations.dispatch({
    ...request,
    includeData: true,
  })).ok, false);
  for (let patch of [
    {
      includeMetadata: undefined,
    },
    {
      destinationSessionId: '../bad',
    },
    {
      destinationProjectId: '/arbitrary/folder',
    },
    {
      confirm: false,
    },
  ]) { assert.throws(() => validateManagerRequest({
    ...request,
    ...patch,
  })); }
});

test('source edits captured during move cleanup remain recoverable and linked definitions cannot escape the selected artifacts', async (t) => {
  let {
    a,
    b,
  } = await fixture(t);
  let original = await save(a);
  let changed = original.html + '<p>Concurrent source edit.</p>';
  let result = await transferSession(a.id, input(b.id, {
    kind: 'move',
  }), {
    beforeRemove: async (key) => { if (key === 'html') { await writeFile(transferPaths(a, 'desk').html, changed); } },
  });
  assert.equal(result.ok, false);
  assert.ok(result.transfer);
  await recoverTransfer(result.transfer.id, a.stateRoot);
  assert.equal(await readFile(transferPaths(a, 'desk').html, 'utf8'), changed);
  assert.equal((await readTransferFiles(transferPaths(b, 'desk'))).html, null);
  await rm(transferPaths(a, 'desk').html);
  await writeFile(transferPaths(b, 'external').html, original.html);
  await symlink(transferPaths(b, 'external').html, transferPaths(a, 'desk').html, 'file');
  await assert.rejects(transferSession(a.id, input(b.id)), /regular files/);
  assert.equal(await readFile(transferPaths(b, 'external').html, 'utf8'), original.html);
});
