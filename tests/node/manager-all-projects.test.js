import assert from 'node:assert/strict';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { temporaryState } from './state-fixture.js';
import { saveDefinition } from '../../src/library/catalog.js';
import { connectProject } from '../../src/projects/registry.js';
import { withStorageFolder } from '../../src/config/storage-scope.js';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';
import { managerSessionKey } from '../../src/manager/scope.js';

test('All projects keeps duplicate IDs distinct, scopes lifecycle operations and deduplicates bulk requests', {
  timeout: 30_000,
}, async (t) => {
  let state = await temporaryState();
  let operations = new ManagerOperations();
  t.after(async () => {
    await operations.dispatch({
      id: 'cleanup',
      operation: 'stop',
      scopeProjectId: 'all',
      all: true,
    });
    await state.close();
  });
  let folders = [
    undefined,
    join(state.directory, 'a'),
    join(state.directory, 'b'),
  ];
  let source = join(state.directory, 'source.html');
  await writeFile(source, '<h1>Shared session ID</h1>');
  for (let folder of folders) {
    if (folder) { await mkdir(folder); await connectProject(folder); }
    await withStorageFolder(folder, () => saveDefinition('desk', source));
  }
  let snapshot = await operations.dispatch({
    id: 'snapshot',
    operation: 'snapshot',
    scopeProjectId: 'all',
  });
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.snapshot?.projects.currentProjectId, 'all');
  assert.equal(snapshot.snapshot?.storage.editable, false);
  assert.equal(snapshot.snapshot?.sessions.length, 3);
  let rows = snapshot.snapshot.sessions;
  assert.equal(new Set(rows.map(managerSessionKey)).size, 3);
  assert.ok(rows.every((row) => row.sessionId === 'desk' && row.project));
  assert.ok(!snapshot.snapshot.projects.projects.some((entry) => entry.id === 'all'));
  let selected = rows.find((row) => row.project?.name === 'a');
  assert.ok(selected?.project);
  let start = {
    id: 'start-one',
    operation: 'start',
    sessionId: 'desk',
    scopeProjectId: selected.project.id,
  };
  let started = await operations.dispatch(start);
  assert.equal(started.ok, true);
  assert.deepEqual(await operations.dispatch(start), started);
  let running = await operations.dispatch({
    id: 'running',
    operation: 'snapshot',
    scopeProjectId: 'all',
  });
  assert.deepEqual(running.snapshot?.sessions.filter((row) => row.active).map((row) => row.project?.name), [
    'a',
  ]);
  assert.equal((await operations.dispatch({
    id: 'ambiguous',
    operation: 'clear',
    scopeProjectId: 'all',
    sessionId: 'desk',
    confirm: true,
  })).ok, false);
  assert.equal((await operations.dispatch({
    id: 'storage',
    operation: 'configure storage',
    scopeProjectId: 'all',
    folder: null,
  })).ok, false);
  assert.throws(() => validateManagerRequest({
    id: 'confirm',
    operation: 'clear',
    scopeProjectId: 'all',
    all: true,
  }));
  let bulk = {
    id: 'bulk',
    operation: 'start',
    scopeProjectId: 'all',
    all: true,
  };
  let result = await operations.dispatch(bulk);
  assert.equal(result.ok, true);
  assert.equal(result.sessions?.length, 3);
  assert.ok(result.sessions.every((row) => row.project && row.active));
  let laterFolder = join(state.directory, 'later');
  await mkdir(laterFolder);
  let laterProject = await connectProject(laterFolder);
  await withStorageFolder(laterFolder, () => saveDefinition('desk', source));
  assert.deepEqual(await operations.dispatch(bulk), result);
  let later = await operations.dispatch({
    id: 'later',
    operation: 'snapshot',
    scopeProjectId: laterProject.id,
  });
  assert.equal(later.snapshot?.sessions[0].active, false);
  await operations.dispatch({
    id: 'stop',
    operation: 'stop',
    scopeProjectId: 'all',
    all: true,
  });
  assert.ok(folders[2]);
  await rename(folders[2], join(state.directory, 'missing'));
  let unavailable = await operations.dispatch({
    id: 'unavailable',
    operation: 'snapshot',
    scopeProjectId: 'all',
  });
  assert.equal(unavailable.ok, true);
  assert.equal(unavailable.snapshot?.sessions.length, 3);
  assert.equal(unavailable.snapshot?.projects.projects.find((row) => row.name === 'b')?.available, false);
  let partial = await operations.dispatch({
    id: 'partial',
    operation: 'stop',
    scopeProjectId: 'all',
    all: true,
  });
  assert.equal(partial.ok, false);
  assert.match(partial.error?.message || '', /b:/);
  let history = await operations.dispatch({
    id: 'history',
    operation: 'transfer history',
    scopeProjectId: 'all',
  });
  assert.equal(history.ok, false);
  assert.match(history.error?.message || '', /b:/);
});
