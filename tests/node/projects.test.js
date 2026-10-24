import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { connectProject, forgetProject, listProjects, registeredProject, rememberProject } from '../../src/projects/registry.js';
import { projectId } from '../../src/projects/identity.js';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';
import { readManager } from '../../src/manager/registry.js';
import { temporaryState } from './state-fixture.js';
import { temporaryManagerProject } from './manager-storage-fixture.js';

let execute = promisify(execFile);
let fixture = fileURLToPath(new URL('./project-registry-fixture.js', import.meta.url));

test('project connections persist across processes, deduplicate aliases and retain missing folders', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let folder = join(state.directory, 'team project');
  await mkdir(folder);
  let alias = join(state.directory, 'alias');
  await symlink(folder, alias, process.platform === 'win32' ? 'junction' : 'dir');
  let connected = await connectProject(folder);
  assert.equal(connected.lastUsedAt, null);
  assert.equal((await connectProject(alias)).id, connected.id);
  let used = await rememberProject(folder, true);
  assert.ok(used.lastUsedAt);
  let restarted = /** @type {import('../../types/projects.js').ProjectListing} */ (JSON.parse((await execute(process.execPath, [
    fixture,
    'list',
  ])).stdout));
  assert.equal(restarted.currentProjectId, 'default');
  assert.equal(restarted.projects.find((entry) => entry.id === connected.id)?.lastUsedAt, used.lastUsedAt);
  assert.equal(restarted.projects.filter((entry) => entry.folder === folder).length, 1);
  assert.equal(restarted.projects.find((entry) => entry.id === 'default')?.available, true);
  await rm(folder, {
    recursive: true,
  });
  let listing = await listProjects(undefined);
  assert.equal(listing.projects.find((entry) => entry.id === connected.id)?.available, false);
  assert.match(listing.projects.find((entry) => entry.id === connected.id)?.error || '', /unavailable/);
  await assert.rejects(connectProject(folder), /unavailable/);
  await assert.rejects(stat(folder), 'Connecting does not recreate a missing folder.');
  await assert.rejects(forgetProject('default', undefined), /cannot be forgotten/);
  await assert.rejects(forgetProject(connected.id, folder), /Switch to another project/);
  await forgetProject(connected.id, undefined);
  assert.equal((await listProjects(undefined)).projects.some((entry) => entry.id === connected.id), false);
});

test('concurrent registry writers preserve all connections and recover a dead process lock', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let folders = await Promise.all(Array.from({
    length: 4,
  }, async (_, index) => {
    let folder = join(state.directory, `project-${index}`);
    await mkdir(folder);
    return folder;
  }));
  await Promise.all(folders.map((folder) => execute(process.execPath, [
    fixture,
    'connect',
    folder,
  ])));
  let listing = await listProjects(undefined);
  for (let folder of folders) { assert.ok(listing.projects.some((entry) => entry.id === projectId(folder))); }
  let child = spawn(process.execPath, [
    '--version',
  ], {
    stdio: 'ignore',
  });
  await once(child, 'exit');
  assert.ok(child.pid);
  await mkdir(join(state.directory, '.projects-lock', `${child.pid}-${randomUUID()}`), {
    recursive: true,
  });
  await rememberProject(folders[0], true);
  assert.ok((await registeredProject(projectId(folders[0]))).lastUsedAt);
  let path = join(state.directory, '.projects.json');
  if (process.platform !== 'win32') { assert.equal((await stat(path)).mode & 0o777, 0o600); }
  await writeFile(path, '{invalid');
  await assert.rejects(listProjects(undefined), /cache/);
  assert.equal(await readFile(path, 'utf8'), '{invalid', 'A corrupt registry is not silently reset.');
});

test('initial registry recovers only valid known manager scopes and does not resurrect forgotten projects', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let folder = join(state.directory, 'previous');
  await mkdir(folder);
  let id = projectId(folder);
  let root = join(state.directory, '.libraries', id);
  let directory = join(root, '.manager', randomUUID());
  await mkdir(directory, {
    recursive: true,
  });
  await writeFile(join(directory, 'manager.json'), JSON.stringify({
    stateRoot: root,
    settings: {
      folder,
    },
    token: 'private-capability-not-for-history',
  }));
  assert.equal((await listProjects(undefined)).projects.find((entry) => entry.id === id)?.available, true);
  assert.equal((await readFile(join(state.directory, '.projects.json'), 'utf8')).includes('private-capability'), false);
  await forgetProject(id, undefined);
  assert.equal((await listProjects(undefined)).projects.some((entry) => entry.id === id), false);
  assert.equal((await listProjects(folder)).projects.some((entry) => entry.id === id), true, 'An open manager retains its own scope.');
  assert.equal((await listProjects(undefined)).projects.some((entry) => entry.id === id), false, 'An open manager refresh must not reconnect a forgotten project.');
  let malformed = join(state.directory, 'not-a-directory');
  await writeFile(malformed, 'file');
  await assert.rejects(connectProject(malformed), /unavailable/);
  await assert.rejects(registeredProject('a'.repeat(64)), /not connected/);
});

test('project request validation restricts targets to their declared operation', () => {
  let id = 'a'.repeat(64);
  for (let request of [
    {
      operation: 'connect project',
      folder: '',
    },
    {
      operation: 'connect project',
      folder: '/folder\0bad',
    },
    {
      operation: 'switch project',
      projectId: '../escape',
    },
    {
      operation: 'switch project',
      projectId: id,
      folder: '/unregistered',
    },
    {
      operation: 'projects',
      sessionId: 'desk',
    },
    {
      operation: 'forget project',
      projectId: id,
      all: true,
    },
    {
      operation: 'snapshot',
      projectId: id,
    },
  ]) { assert.throws(() => validateManagerRequest({
    id: 'validation',
    ...request,
  })); }
  assert.equal(validateManagerRequest({
    id: 'valid',
    operation: 'switch project',
    projectId: 'default',
  }).projectId, 'default');
});

test('explicit configuration remembers folders and connection removal preserves their files', async (t) => {
  let project = await temporaryManagerProject();
  t.after(() => project.close());
  let configured = await project.cli([
    'config',
    'folder',
    './library',
  ]);
  let folder = configured.settings.folder;
  let id = projectId(folder);
  assert.equal((await registeredProject(id)).folder, folder);
  let source = join(folder, 'desk.html');
  await writeFile(source, '<h1>Keep this definition</h1>');
  let operations = new ManagerOperations({
    stateRoot: project.directory,
    settings: {
      mode: 'cache',
      source: 'project',
    },
    projectDirectory: project.projectDirectory,
    instanceId: randomUUID(),
    token: '',
    pid: process.pid,
  });
  let connected = await operations.dispatch({
    id: randomUUID(),
    operation: 'connect project',
    folder: './library',
  });
  assert.equal(connected.project?.id, id, 'Relative paths resolve against the launch project directory.');
  let forgotten = await operations.dispatch({
    id: randomUUID(),
    operation: 'forget project',
    projectId: id,
  });
  assert.equal(forgotten.ok, true);
  assert.equal(await readFile(source, 'utf8'), '<h1>Keep this definition</h1>');
  await writeFile(join(project.directory, '.projects.json'), '{invalid');
  await assert.rejects(project.cli([
    'config',
    'reset',
  ]), (error) => {
    let result = JSON.parse(/** @type {Error & { stdout: string }} */ (error).stdout);
    assert.match(result.error.message, /configuration was saved, but project history/);
    return true;
  });
  assert.deepEqual(JSON.parse(await readFile(join(project.projectDirectory, '.agui.json'), 'utf8')), {});
});

test('manager switches connected scopes without changing configuration, workers or session identities', { timeout: 60000 }, async (t) => {
  let project = await temporaryManagerProject();
  t.after(() => project.close());
  let configPath = join(project.projectDirectory, '.agui.json');
  await writeFile(configPath, '{"label":"preserve configuration"}\n');
  let initial = await project.cli([
    'manager',
    '--no-open',
  ]);
  let record = await readManager();
  assert.ok(record);
  let operations = new ManagerOperations(record);
  let folders = [
    join(project.projectDirectory, 'a'),
    join(project.projectDirectory, 'b'),
  ];
  let source = join(project.directory, 'fixture.html');
  await writeFile(source, '<h1>Project fixture</h1>');
  let sessions = [];
  for (let folder of folders) {
    await mkdir(folder);
    await project.cli([
      'save',
      'desk',
      '--file',
      source,
    ], folder);
    sessions.push(await project.cli([
      'start',
      'desk',
      '--no-open',
    ], folder));
    let connected = await operations.dispatch({
      id: randomUUID(),
      operation: 'connect project',
      folder,
    });
    assert.equal(connected.ok, true);
    assert.equal(connected.project?.lastUsedAt, null);
  }
  let environment = {
    library: process.env.AGUI_LIBRARY_DIR,
    worker: process.env.AGUI_WORKER_STATE_DIR,
  };
  let request = {
    id: randomUUID(),
    operation: /** @type {const} */ ('switch project'),
    projectId: projectId(folders[0]),
  };
  let switched = await operations.dispatch(request);
  assert.equal(switched.ok, true, switched.error?.message);
  assert.equal(switched.manager?.settings.folder, folders[0]);
  assert.ok(switched.project?.lastUsedAt);
  assert.deepEqual(await operations.dispatch(request), switched);
  assert.equal((await operations.dispatch({
    ...request,
    projectId: projectId(folders[1]),
  })).ok, false, 'A repeated request ID cannot select a different project.');
  let destination = await project.cli([
    'manager',
    '--no-open',
  ], folders[0]);
  assert.equal(destination.url, switched.manager?.url, 'Navigation reuses the existing scoped manager.');
  assert.notEqual(destination.url, initial.url);
  let reset = await operations.dispatch({
    id: randomUUID(),
    operation: 'switch project',
    projectId: 'default',
  });
  assert.equal(reset.manager?.url, initial.url);
  for (let [index, folder] of folders.entries()) {
    let status = await project.cli([
      'status',
      'desk',
    ], folder);
    assert.equal(status.url, sessions[index].url);
    assert.equal(status.feedback.instanceId, sessions[index].feedback.instanceId);
  }
  assert.equal(await readFile(configPath, 'utf8'), '{"label":"preserve configuration"}\n');
  assert.equal(process.env.AGUI_LIBRARY_DIR, environment.library);
  assert.equal(process.env.AGUI_WORKER_STATE_DIR, environment.worker);
  let unused = await connectProject(join(project.projectDirectory, 'b'));
  await rm(folders[1], {
    recursive: true,
  });
  let failed = await operations.dispatch({
    id: randomUUID(),
    operation: 'switch project',
    projectId: unused.id,
  });
  assert.equal(failed.ok, false);
  assert.equal((await registeredProject(unused.id)).lastUsedAt, null, 'A failed switch does not mark the folder used.');
  assert.ok((await operations.snapshot()).projects.projects.some((entry) => entry.id === unused.id && !entry.available));
  await assert.rejects(stat(folders[1]));
});
