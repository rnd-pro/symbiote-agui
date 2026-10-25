import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { pickFolder } from '../../src/browser/pick-folder.js';
import { chooseProject } from '../../src/projects/choose.js';
import { listProjects } from '../../src/projects/registry.js';
import { validateManagerRequest } from '../../src/manager/operations.js';
import { temporaryState } from './state-fixture.js';

test('native folder pickers use fixed commands and preserve literal paths from stdout', async () => {
  for (let fixture of [
    {
      platform: /** @type {const} */ ('darwin'),
      command: '/usr/bin/osascript',
      folder: '/tmp/team folder/$(touch nope); "quoted"',
    },
    {
      platform: /** @type {const} */ ('win32'),
      command: 'powershell.exe',
      folder: 'C:\\team folder\\contacts & reports',
    },
    {
      platform: /** @type {const} */ ('linux'),
      command: 'zenity',
      folder: '/tmp/team folder/日本語 ',
    },
  ]) {
    let calls = 0;
    let result = await pickFolder({
      platform: fixture.platform,
      env: {
        DISPLAY: ':1',
      },
      launch: async (command, args) => {
        calls += 1;
        assert.equal(command, fixture.command);
        assert.equal(args.includes(fixture.folder), false, 'A selected path is output, never executable input.');
        return {
          stdout: `${fixture.folder}\r\n`,
        };
      },
    });
    assert.equal(result, fixture.folder);
    assert.equal(calls, 1);
  }
});

test('picker cancellation is distinct from desktop, timeout and invalid-output failures', async () => {
  for (let platform of /** @type {const} */ ([
    'darwin',
    'win32',
    'linux',
  ])) {
    assert.equal(await pickFolder({
      platform,
      env: {
        WAYLAND_DISPLAY: 'wayland-0',
      },
      launch: async () => ({
        stdout: '',
      }),
    }), undefined);
  }
  let linux = {
    platform: /** @type {const} */ ('linux'),
    env: {
      DISPLAY: ':1',
    },
  };
  assert.equal(await pickFolder({
    ...linux,
    launch: async () => { throw Object.assign(new Error('Canceled'), {
      code: 1,
      stderr: '',
    }); },
  }), undefined);
  await assert.rejects(pickFolder({
    ...linux,
    launch: async () => { throw Object.assign(new Error('Desktop unavailable'), {
      code: 1,
      stderr: 'Cannot open display',
    }); },
  }), /Desktop unavailable/);
  await assert.rejects(pickFolder({
    platform: 'linux',
    env: {},
  }), /desktop session/);
  await assert.rejects(pickFolder({
    platform: 'freebsd',
  }), /not supported/);
  await assert.rejects(pickFolder({
    platform: 'darwin',
    launch: async () => { throw Object.assign(new Error('Killed'), {
      killed: true,
    }); },
  }), /timed out/);
  await assert.rejects(pickFolder({
    platform: 'darwin',
    launch: async () => ({
      stdout: 'relative/folder',
    }),
  }), /invalid absolute path/);
});

test('Linux falls back to KDialog only when Zenity is missing', async () => {
  /** @type {string[]} */
  let commands = [];
  assert.equal(await pickFolder({
    platform: 'linux',
    env: {
      DISPLAY: ':1',
    },
    launch: async (command) => {
      commands.push(command);
      if (command === 'zenity') { throw Object.assign(new Error('Missing'), {
        code: 'ENOENT',
      }); }
      return {
        stdout: '/tmp/team folder\n',
      };
    },
  }), '/tmp/team folder');
  assert.deepEqual(commands, [
    'zenity',
    'kdialog',
  ]);
  await assert.rejects(pickFolder({
    platform: 'linux',
    env: {
      DISPLAY: ':1',
    },
    launch: async () => { throw Object.assign(new Error('Missing'), {
      code: 'ENOENT',
    }); },
  }), /No desktop folder picker/);
});

test('choosing a project connects only a valid selection and cancellation changes nothing', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let folder = join(state.directory, 'chosen project');
  await mkdir(folder);
  let source = join(folder, 'desk.html');
  await writeFile(source, '<h1>Keep source</h1>');
  assert.equal(validateManagerRequest({
    id: 'choose',
    operation: 'choose project',
  }).operation, 'choose project');
  for (let target of [
    {
      folder,
    },
    {
      projectId: 'default',
    },
    {
      all: true,
    },
  ]) {
    assert.throws(() => validateManagerRequest({
      id: 'choose',
      operation: 'choose project',
      ...target,
    }));
  }
  let before = await listProjects(undefined);
  assert.deepEqual(await chooseProject(state.directory, async () => undefined), {
    ok: true,
    cancelled: true,
  });
  assert.deepEqual(await listProjects(undefined), before);
  let connected = await chooseProject(state.directory, async () => folder);
  assert.equal(connected.project?.folder, folder);
  assert.equal((await listProjects(undefined)).currentProjectId, 'default');
  assert.equal(await readFile(source, 'utf8'), '<h1>Keep source</h1>');
  await assert.rejects(chooseProject(state.directory, async () => source), /unavailable/);
  await assert.rejects(chooseProject(state.directory, async () => { throw new Error('Fixture picker failure'); }), /Enter folder path instead/);
});
