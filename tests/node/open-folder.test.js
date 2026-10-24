import assert from 'node:assert/strict';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { openFolder } from '../../src/browser/open-folder.js';
import { openProjectFolder } from '../../src/projects/open.js';
import { connectProject, listProjects } from '../../src/projects/registry.js';
import { validateManagerRequest } from '../../src/manager/operations.js';
import { temporaryState } from './state-fixture.js';

test('folder opening passes one literal absolute path to the fixed platform command', async () => {
  for (let fixture of [
    {
      platform: /** @type {const} */ ('darwin'),
      command: 'open',
      folder: '/tmp/team folder/$(touch nope); & "quoted"',
    },
    {
      platform: /** @type {const} */ ('linux'),
      command: 'xdg-open',
      folder: '/tmp/team folder/$(touch nope); & "quoted"',
    },
    {
      platform: /** @type {const} */ ('win32'),
      command: 'explorer.exe',
      folder: 'C:\\team folder\\literal & data',
    },
  ]) {
    let calls = 0;
    await openFolder(fixture.folder, {
      platform: fixture.platform,
      env: {
        DISPLAY: ':1',
      },
      launch: async (command, args) => {
        calls += 1;
        assert.equal(command, fixture.command);
        assert.deepEqual(args, [
          fixture.folder,
        ]);
      },
    });
    assert.equal(calls, 1);
  }
});

test('folder opening reports headless, unsupported, invalid-path and launcher failures', async () => {
  let calls = 0;
  let launch = async () => { calls += 1; };
  await assert.rejects(openFolder('/tmp/project', {
    platform: 'linux',
    env: {},
    launch,
  }), /desktop session/);
  await assert.rejects(openFolder('/tmp/project', {
    platform: 'freebsd',
    launch,
  }), /not supported/);
  for (let folder of [
    'relative/project',
    'https://example.com/',
    '/tmp/bad\0folder',
  ]) {
    await assert.rejects(openFolder(folder, {
      platform: 'darwin',
      launch,
    }), /absolute folder/);
  }
  assert.equal(calls, 0);
  await openFolder('/tmp/project', {
    platform: 'linux',
    env: {
      WAYLAND_DISPLAY: 'wayland-0',
    },
    launch,
  });
  assert.equal(calls, 1);
  await assert.rejects(openFolder('/tmp/project', {
    platform: 'darwin',
    launch: async () => { throw new Error('Fixture missing opener or denied launch.'); },
  }), /Fixture missing opener/);
});

test('manager folder opening resolves registered projects and Default without altering scope or definitions', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let folder = join(state.directory, 'team folder');
  await mkdir(folder);
  let html = join(folder, 'desk.html');
  await writeFile(html, '<h1>Preserve definition</h1>');
  let project = await connectProject(folder);
  /** @type {string[]} */
  let opened = [];
  let open = async (/** @type {string} */ path) => { opened.push(path); };
  assert.equal(validateManagerRequest({
    id: 'open',
    operation: 'open folder',
    projectId: project.id,
  }).projectId, project.id);
  let result = await openProjectFolder(project.id, open);
  assert.equal(result.ok, true);
  assert.equal(result.folderPath, folder);
  assert.equal(result.project?.lastUsedAt, null, 'Opening a folder is not a scope switch.');
  let cache = join(state.directory, '.cache');
  await assert.rejects(stat(cache));
  let defaultResult = await openProjectFolder('default', open);
  assert.equal(defaultResult.folderPath, cache);
  assert.equal((await stat(cache)).isDirectory(), true);
  assert.deepEqual(opened, [
    folder,
    cache,
  ]);
  await assert.rejects(openProjectFolder('a'.repeat(64), open), /not connected/);
  await assert.rejects(openProjectFolder('../escape', open), /connected project/);
  await assert.rejects(openProjectFolder(project.id, async () => { throw new Error('Fixture desktop failure.'); }), (error) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Fixture desktop failure/);
    assert.ok(error.message.includes(folder), 'The error retains a copyable folder path.');
    return true;
  });
  assert.equal(await readFile(html, 'utf8'), '<h1>Preserve definition</h1>');
  await rm(folder, {
    recursive: true,
  });
  let count = opened.length;
  await assert.rejects(openProjectFolder(project.id, open), /unavailable/);
  assert.equal(opened.length, count, 'Unavailable projects never invoke the OS opener.');
  await assert.rejects(stat(folder), 'A missing connected folder is not recreated.');
  assert.equal((await listProjects(undefined)).currentProjectId, 'default');
});
