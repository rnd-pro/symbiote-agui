import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, rename, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { withStorageFolder } from '../../src/config/storage-scope.js';
import { getSettings } from '../../src/config/settings.js';
import { getStateRoot, stateRootForFolder } from '../../src/sessions/store.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { startSession } from '../../src/sessions/start.js';
import { statusSession, stopSession } from '../../src/sessions/lifecycle.js';
import { connectProject, listProjects } from '../../src/projects/registry.js';
import { ManagerOperations } from '../../src/manager/operations.js';
import { managerDirectory, readManager, releaseManager, writeManager } from '../../src/manager/registry.js';
import { startManager, stopManager } from '../../src/manager/lifecycle.js';
import { startManagerServer } from '../../src/manager/server.js';
import { temporaryState } from './state-fixture.js';

/**
 * @param {string} folder
 * @param {string} name
 */
async function save(folder, name) {
  await withStorageFolder(folder, async () => {
    let pending = await prepareCachedMarkup('desk', `<h1>${name}</h1>`);
    try { await pending.commit(); }
    finally { await pending.discard(); }
  });
}

test('concurrent operations on identical session IDs keep folder workers and request histories isolated', async (t) => {
  let state = await temporaryState();
  let a = join(state.directory, 'a');
  let b = join(state.directory, 'b');
  await mkdir(a);
  await mkdir(b);
  t.after(async () => {
    await withStorageFolder(a, () => stopSession('desk'));
    await withStorageFolder(b, () => stopSession('desk'));
    await state.close();
  });
  let projectA = await connectProject(a);
  let projectB = await connectProject(b);
  await save(a, 'Folder A');
  await save(b, 'Folder B');
  let root = getStateRoot();
  let settings = getSettings();
  let operations = new ManagerOperations();
  let request = {
    id: 'shared-request-id',
    operation: 'start',
    sessionId: 'desk',
  };
  let [
    startedA,
    startedB,
  ] = await Promise.all([
    operations.dispatch({
      ...request,
      scopeProjectId: projectA.id,
    }),
    operations.dispatch({
      ...request,
      scopeProjectId: projectB.id,
    }),
  ]);
  assert.equal(startedA.ok, true);
  assert.equal(startedB.ok, true);
  let workerA = startedA.sessions?.[0];
  let workerB = startedB.sessions?.[0];
  assert.ok(workerA?.url && workerB?.url);
  assert.notEqual(workerA.url, workerB.url);
  assert.notEqual(workerA.feedback?.instanceId, workerB.feedback?.instanceId);
  let stopped = await operations.dispatch({
    id: 'stop-a',
    operation: 'stop',
    sessionId: 'desk',
    scopeProjectId: projectA.id,
  });
  assert.equal(stopped.ok, true);
  let snapshotB = await operations.dispatch({
    id: 'read-b',
    operation: 'snapshot',
    scopeProjectId: projectB.id,
  });
  assert.equal(snapshotB.snapshot?.sessions[0].url, workerB.url);
  assert.equal(snapshotB.snapshot?.sessions[0].active, true);
  assert.equal(getStateRoot(), root);
  assert.deepEqual(getSettings(), settings);
  assert.equal((await operations.dispatch({
    id: 'unregistered',
    operation: 'clear',
    sessionId: 'desk',
    confirm: true,
    scopeProjectId: 'f'.repeat(64),
  })).ok, false);
  await rename(a, `${a}-original`);
  await symlink(b, a);
  let redirected = await operations.dispatch({
    id: 'redirected-folder',
    operation: 'clear',
    sessionId: 'desk',
    confirm: true,
    scopeProjectId: projectA.id,
  });
  assert.equal(redirected.ok, false);
  assert.match(redirected.error?.message || '', /different location/);
  let selected = await operations.dispatch({
    id: 'leave-redirected-folder',
    operation: 'switch project',
    scopeProjectId: projectA.id,
    projectId: projectB.id,
  });
  assert.equal(selected.ok, true);
  assert.equal(selected.project?.id, projectB.id);
});

test('one shared manager retires legacy folder managers without restarting their AGUI workers', async (t) => {
  let state = await temporaryState();
  let folder = join(state.directory, 'legacy-project');
  await mkdir(folder);
  await save(folder, 'Legacy project');
  let session = await withStorageFolder(folder, () => startSession('desk'));
  /** @type {import('../../types/manager.js').ManagerRecord} */
  let legacy = {
    stateRoot: stateRootForFolder(folder),
    settings: {
      source: 'environment',
      mode: 'folder',
      folder,
    },
    projectDirectory: folder,
    instanceId: randomUUID(),
    token: randomBytes(32).toString('hex'),
    pid: process.pid,
  };
  let retired = false;
  let endpoint = await startManagerServer(legacy, () => {
    void endpoint.close().then(() => releaseManager(legacy)).then(() => { retired = true; });
  });
  legacy.url = endpoint.url;
  await mkdir(managerDirectory(legacy), {
    recursive: true,
  });
  await writeManager(legacy);
  t.after(async () => {
    await stopManager();
    await withStorageFolder(folder, () => stopSession('desk'));
    if (!retired) { await endpoint.close(); }
    await releaseManager(legacy);
    await state.close();
  });
  let manager = await startManager(false);
  let reused = await withStorageFolder(folder, () => startManager(false));
  assert.equal(retired, true);
  assert.equal(await readManager(legacy.stateRoot), undefined);
  assert.equal(reused.url, manager.url);
  assert.equal(reused.pid, manager.pid);
  assert.equal((await withStorageFolder(folder, () => statusSession('desk', false))).url, session.url);
  assert.ok((await listProjects(undefined)).projects.some((entry) => entry.folder === folder));
});
