import assert from 'node:assert/strict';
import { mkdir, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { assetFixture } from './assets-fixture.js';
import { temporaryManagerProject } from './manager-storage-fixture.js';
import { definitionPaths, cachedDefinitionPaths } from '../../src/library/paths.js';
import { saveDefinition } from '../../src/library/catalog.js';
import { clearSession } from '../../src/sessions/clear.js';

test('explicit cache import includes assets and keeps the private original without inheriting private data', async (t) => {
  let f = await assetFixture();
  t.after(() => f.close());
  await f.run([
    'add',
    'desk',
    '--file',
    f.source,
    '--as',
    'images/logo.svg',
  ]);
  let cached = cachedDefinitionPaths('desk');
  let original = await readFile(cached.htmlPath);
  let folder = join(f.directory, 'project');
  await mkdir(folder);
  process.env.AGUI_LIBRARY_DIR = folder;
  await saveDefinition('desk');
  assert.deepEqual(await readFile(join(folder, 'desk.assets/images/logo.svg')), f.bytes);
  assert.deepEqual(await readFile(cached.htmlPath), original);
  assert.deepEqual(await readFile(join(cached.assetsPath, 'images/logo.svg')), f.bytes);
  await clearSession('desk');
  await assert.rejects(stat(join(folder, 'desk.assets')));
  assert.deepEqual(await readFile(f.source), f.bytes);
  assert.deepEqual(await readFile(join(cached.assetsPath, 'images/logo.svg')), f.bytes);
});

test('cache import refuses an asset-only destination rather than silently merging its contents', async (t) => {
  let f = await assetFixture();
  t.after(() => f.close());
  let folder = join(f.directory, 'project');
  await mkdir(join(folder, 'desk.assets'), {
    recursive: true,
  });
  await writeFile(join(folder, 'desk.assets/keep.txt'), 'keep');
  process.env.AGUI_LIBRARY_DIR = folder;
  await assert.rejects(saveDefinition('desk'), /Destination assets already exist/);
  assert.equal(await readFile(join(folder, 'desk.assets/keep.txt'), 'utf8'), 'keep');
  await assert.rejects(stat(join(folder, 'desk.html')));
});

test('failed cache import rolls back only its own assets and preserves conflicting policies and source files', async (t) => {
  let f = await assetFixture();
  t.after(() => f.close());
  await f.run([
    'add',
    'desk',
    '--file',
    f.source,
  ]);
  let cached = cachedDefinitionPaths('desk');
  await writeFile(cached.proxyPath, JSON.stringify({
    version: 1,
    allowedOrigins: [],
  }));
  let folder = join(f.directory, 'project');
  await mkdir(folder);
  let conflicting = join(folder, 'desk.proxy.json');
  await writeFile(conflicting, 'keep existing policy');
  process.env.AGUI_LIBRARY_DIR = folder;
  await assert.rejects(saveDefinition('desk'), /file changed/i);
  await assert.rejects(stat(join(folder, 'desk.assets')));
  await assert.rejects(stat(join(folder, 'desk.html')));
  assert.equal(await readFile(conflicting, 'utf8'), 'keep existing policy');
  assert.deepEqual(await readFile(join(cached.assetsPath, 'logo.svg')), f.bytes);
  assert.deepEqual(await readFile(f.source), f.bytes);
});

test('clear refuses linked asset trees without following them or deleting the saved definition', async (t) => {
  let f = await assetFixture();
  t.after(() => f.close());
  let paths = definitionPaths('desk');
  let outside = join(f.directory, 'outside');
  await mkdir(outside);
  await writeFile(join(outside, 'keep.svg'), 'private');
  await symlink(outside, paths.assetsPath, 'dir');
  await assert.rejects(clearSession('desk'), /symbolic link/);
  assert.equal(await readFile(join(outside, 'keep.svg'), 'utf8'), 'private');
  assert.equal((await stat(paths.htmlPath)).isFile(), true);
});

test('running clear removes assets and permits a fresh asset root on the same worker instance', async (t) => {
  let p = await temporaryManagerProject();
  t.after(() => p.close());
  let html = join(p.directory, 'input.html');
  let source = join(p.directory, 'logo.svg');
  await writeFile(html, '<p>Asset clear fixture</p>');
  await writeFile(source, '<svg/>');
  await p.cli([
    'save',
    'desk',
    '--file',
    html,
  ], '');
  await p.cli([
    'assets',
    'add',
    'desk',
    '--file',
    source,
  ], '');
  let initial = await p.cli([
    'start',
    'desk',
    '--no-open',
  ], '');
  assert.equal((await fetch(new URL('_assets/logo.svg', initial.url))).status, 200);
  await p.cli([
    'clear',
    'desk',
  ], '');
  await assert.rejects(stat(definitionPaths('desk').assetsPath));
  assert.equal((await fetch(new URL('_assets/logo.svg', initial.url))).status, 404);
  await p.cli([
    'save',
    'desk',
    '--file',
    html,
  ], '');
  await writeFile(source, '<svg id="new"/>');
  await p.cli([
    'assets',
    'add',
    'desk',
    '--file',
    source,
  ], '');
  assert.equal(await (await fetch(new URL('_assets/logo.svg', initial.url))).text(), '<svg id="new"/>');
  assert.equal((await p.cli([
    'status',
    'desk',
  ], '')).instanceId, initial.instanceId);
});
