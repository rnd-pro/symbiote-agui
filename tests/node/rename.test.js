import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { renameSession } from '../../src/sessions/rename.js';
import { rememberProject } from '../../src/projects/registry.js';
import { transferScope, transferPaths } from '../../src/projects/transfer/scope.js';
import { readTransferFiles } from '../../src/projects/transfer/snapshot.js';
import { recoverTransfer } from '../../src/projects/transfer/recover.js';
import { readRuntimeCache } from '../../src/data/cache.js';
import { getStateRoot, readSession, reserveSession, writeSession } from '../../src/sessions/store.js';
import { parseCommand } from '../../src/cli/parse.js';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';
import { temporaryState } from './state-fixture.js';
import { temporaryManagerProject } from './manager-storage-fixture.js';
import { writeTransferFixture } from './transfer-fixture.js';

test('rename moves all saved artifacts within cache and library scopes without changing descriptions or committed records', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let library = join(state.directory, 'library');
  await mkdir(library);
  for (let folder of [
    '',
    library,
  ]) {
    process.env.AGUI_LIBRARY_DIR = folder;
    let project = await rememberProject(folder || undefined);
    let scope = await transferScope(project.id);
    let files = await writeTransferFixture(scope, 'before');
    let renamed = await renameSession('before', 'after');
    assert.equal(renamed.ok, true);
    assert.equal(renamed.renamed, true);
    assert.equal(renamed.previousSessionId, 'before');
    assert.equal(renamed.sessionId, 'after');
    assert.equal(renamed.active, false);
    assert.equal(renamed.transfer?.recoveryRequired, false);
    let saved = await readTransferFiles(transferPaths(scope, 'after'));
    assert.equal(saved.proxy, files.proxy);
    assert.equal(saved.html, files.html);
    assert.equal(saved.description, files.description);
    assert.equal(saved.metadata, files.metadata);
    assert.match((await readRuntimeCache('after'))?.html || '', /committed/);
    for (let path of Object.values(transferPaths(scope, 'before'))) { await assert.rejects(stat(path)); }
    assert.equal(await readSession('after'), undefined, 'Renaming does not start a worker or inherit a runtime identity.');
  }
});

test('rename rejects collisions, invalid IDs and active workers while preserving source and destination', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let scope = await transferScope((await rememberProject(undefined)).id);
  let source = await writeTransferFixture(scope, 'before');
  let destination = await writeTransferFixture(scope, 'occupied');
  for (let name of [
    'occupied',
    'before',
    'BEFORE',
    'all',
    '../outside',
    '',
  ]) { await assert.rejects(renameSession('before', name)); }
  assert.deepEqual(await readTransferFiles(transferPaths(scope, 'before')), source);
  assert.deepEqual(await readTransferFiles(transferPaths(scope, 'occupied')), destination);
  let record = await reserveSession('before');
  record.pid = process.pid;
  await writeSession(record);
  await assert.rejects(renameSession('before', 'after'), /stop it before/);
  assert.deepEqual(await readSession('before'), record);
  assert.deepEqual(await readTransferFiles(transferPaths(scope, 'before')), source);
  assert.equal((await readTransferFiles(transferPaths(scope, 'after'))).html, null);
});

test('interrupted rename uses existing transfer recovery and protects both IDs until explicitly recovered', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let scope = await transferScope((await rememberProject(undefined)).id);
  let source = await writeTransferFixture(scope, 'before');
  let result = await renameSession('before', 'after', {
    beforeRemove: async (key) => { if (key === 'data') { throw new Error('Fixture removal failure.'); } },
  });
  assert.equal(result.ok, false);
  assert.equal(result.renamed, false);
  assert.equal(result.transfer?.recoveryRequired, true);
  await assert.rejects(renameSession('before', 'retry'), /unfinished transfer/);
  assert.ok(result.transfer);
  let recovery = await recoverTransfer(result.transfer.id, getStateRoot());
  assert.equal(recovery.ok, true);
  assert.deepEqual(await readTransferFiles(transferPaths(scope, 'before')), source);
  for (let path of Object.values(transferPaths(scope, 'after'))) { await assert.rejects(stat(path)); }
  assert.equal((await renameSession('before', 'after')).ok, true);
});

test('rename CLI and manager requests use one scoped operation and reject cross-project or optional data changes', async (t) => {
  assert.deepEqual(parseCommand([
    'rename',
    'before',
    'after',
  ]), {
    kind: 'rename',
    sessionId: 'before',
    destinationSessionId: 'after',
  });
  for (let args of [
    [
      'rename',
      'before',
    ],
    [
      'rename',
      'before',
      '../invalid',
    ],
    [
      'rename',
      'before',
      'after',
      '--no-open',
    ],
  ]) { assert.throws(() => parseCommand(args)); }
  let request = {
    id: 'rename-test',
    operation: 'rename session',
    sessionId: 'before',
    destinationSessionId: 'after',
    confirm: true,
  };
  assert.equal(validateManagerRequest(request).operation, 'rename session');
  for (let extra of [
    {
      confirm: false,
    },
    {
      all: true,
    },
    {
      destinationProjectId: 'default',
    },
    {
      includeData: false,
    },
    {
      includeMetadata: false,
    },
  ]) { assert.throws(() => validateManagerRequest({
    ...request,
    ...extra,
  })); }
  let project = await temporaryManagerProject();
  t.after(() => project.close());
  let source = join(project.directory, 'source.html');
  await writeFile(source, '<h1>Rename fixture</h1>');
  await project.cli([
    'save',
    'before',
    '--file',
    source,
  ]);
  let cli = await project.cli([
    'rename',
    'before',
    'intermediate',
  ]);
  assert.equal(cli.renamed, true);
  assert.equal(cli.sessionId, 'intermediate');
  let manager = new ManagerOperations();
  let operation = {
    ...request,
    sessionId: 'intermediate',
  };
  let result = await manager.dispatch(operation);
  assert.equal(result.ok, true);
  assert.deepEqual(await manager.dispatch(operation), result, 'An identical manager request reuses the completed rename.');
  assert.equal((await manager.dispatch({
    ...operation,
    destinationSessionId: 'another',
  })).ok, false);
  let saved = await project.cli([
    'list',
  ]);
  assert.deepEqual(saved.definitions.map((/** @type {{sessionId: string}} */ entry) => entry.sessionId), [
    'after',
  ]);
  assert.equal(await readFile(transferPaths(await transferScope('default'), 'after').html, 'utf8'), '<h1>Rename fixture</h1>');
});
