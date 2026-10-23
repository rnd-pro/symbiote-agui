import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { WebSocket } from 'ws';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';
import { reserveManager, releaseManager } from '../../src/manager/registry.js';
import { temporaryState } from './state-fixture.js';
import { temporaryManagerProject } from './manager-storage-fixture.js';

/**
 * @param {import('../../types/manager.js').ManagerStatus} manager
 * @param {import('../../types/manager.js').ManagerRequest} request
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
async function requestManager(manager, request) {
  let url = new URL(manager.launchUrl || '');
  let socket = new WebSocket(`ws://${url.host}/manager/socket`, {
    origin: url.origin,
  });
  await once(socket, 'open');
  try {
    socket.send(JSON.stringify({
      type: 'authenticate',
      token: url.hash.slice(1),
    }));
    await once(socket, 'message');
    socket.send(JSON.stringify(request));
    return JSON.parse(String((await once(socket, 'message'))[0])).result;
  } finally {
    socket.close();
    await once(socket, 'close');
  }
}

test('manager save-folder requests validate paths and respect environment overrides', async (t) => {
  let state = await temporaryState();
  let record = await reserveManager();
  t.after(async () => { await releaseManager(record); await state.close(); });
  for (let folder of [
    undefined,
    '',
    ' ',
    '../bad\0path',
    42,
    'x'.repeat(4097),
  ]) {
    assert.throws(() => validateManagerRequest({
      id: 'invalid',
      operation: 'configure storage',
      folder,
    }));
  }
  assert.throws(() => validateManagerRequest({
    id: 'wrong-operation',
    operation: 'start',
    sessionId: 'desk',
    folder: '/unrelated',
  }));
  let operations = new ManagerOperations(record);
  assert.equal((await operations.snapshot()).storage.editable, false);
  let result = await operations.dispatch({
    id: 'override',
    operation: 'configure storage',
    folder: join(state.directory, 'rejected'),
  });
  assert.equal(result.ok, false);
  assert.match(result.error?.message || '', /AGUI_LIBRARY_DIR/);
  await assert.rejects(stat(join(state.directory, 'rejected')));
});

test('manager save-folder changes open the selected scope and reset without moving live sessions', { timeout: 45_000 }, async (t) => {
  let project = await temporaryManagerProject();
  let folder = join(project.projectDirectory, 'shared aguis');
  t.after(async () => {
    await project.cli([
      'manager',
      'stop',
    ], folder).catch(() => {});
    await project.close();
  });
  let configPath = join(project.projectDirectory, '.agui.json');
  await writeFile(configPath, JSON.stringify({
    label: 'keep',
  }));
  let htmlPath = join(project.directory, 'fixture.html');
  await writeFile(htmlPath, '<h1>Saved definition</h1>');
  await project.cli([
    'save',
    'original',
    '--file',
    htmlPath,
  ]);
  let original = await project.cli([
    'start',
    'original',
    '--no-open',
  ]);
  let manager = await project.cli([
    'manager',
    '--no-open',
  ]);
  let request = {
    id: 'set-folder',
    operation: /** @type {const} */ ('configure storage'),
    folder: './shared aguis',
  };
  let result = await requestManager(manager, request);
  assert.equal(result.ok, true);
  assert.ok(result.manager?.launchUrl);
  assert.equal(result.manager.settings.folder, folder);
  assert.notEqual(result.manager.url, manager.url);
  assert.deepEqual(await requestManager(manager, request), result, 'A repeated request returns the same manager.');
  assert.deepEqual(JSON.parse(await readFile(configPath, 'utf8')), {
    label: 'keep',
    folder: 'shared aguis',
  });
  assert.equal((await stat(folder)).isDirectory(), true);
  assert.equal((await project.cli([
    'status',
    'original',
  ], '')).url, original.url);
  await assert.rejects(stat(join(folder, 'original.html')), 'Changing settings does not move saved definitions.');
  let filePath = join(project.projectDirectory, 'not-a-directory');
  await writeFile(filePath, 'file');
  let invalid = await requestManager(manager, {
    id: 'invalid-folder',
    operation: 'configure storage',
    folder: filePath,
  });
  assert.equal(invalid.ok, false);
  assert.equal(JSON.parse(await readFile(configPath, 'utf8')).folder, 'shared aguis');
  await writeFile(configPath, '{invalid');
  let snapshot = await requestManager(manager, {
    id: 'broken-project-config',
    operation: 'snapshot',
  });
  assert.equal(snapshot.ok, true, 'Invalid project configuration cannot hide pinned sessions.');
  assert.equal(snapshot.snapshot?.storage.editable, false);
  assert.match(snapshot.snapshot?.storage.message || '', /Fix the project configuration/);
  assert.equal(snapshot.snapshot?.sessions.find((row) => row.sessionId === 'original')?.url, original.url);
  await writeFile(configPath, JSON.stringify({
    label: 'keep',
    folder: 'shared aguis',
  }));
  let reset = await requestManager(result.manager, {
    id: 'reset-folder',
    operation: 'configure storage',
    folder: null,
  });
  assert.equal(reset.ok, true);
  assert.equal(reset.manager?.url, manager.url, 'Reset reuses the still-running cache manager.');
  assert.deepEqual(JSON.parse(await readFile(configPath, 'utf8')), {
    label: 'keep',
  });
  assert.equal((await project.cli([
    'status',
    'original',
  ])).url, original.url);
});
