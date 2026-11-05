import assert from 'node:assert/strict';
import { link, mkdir, open, readFile, rename, rm, stat, symlink, truncate, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { assetFixture } from './assets-fixture.js';
import { definitionPaths } from '../../src/library/paths.js';
import { ASSET_LIMITS } from '../../src/assets/constants.js';
import { assetRoot, assertAssetRoot, assertAssetFileUnchanged, assetFileInfo, readAssetSource, resolveAssetFile } from '../../src/assets/files.js';
import { scanAssets } from '../../src/assets/inventory.js';

test('asset imports and inventories refuse links and preserve files outside their publication root', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  let outside = join(fixture.directory, 'outside');
  await mkdir(outside);
  let sentinel = join(outside, 'secret.svg');
  await writeFile(sentinel, 'private bytes');
  let linked = join(fixture.directory, 'linked.svg');
  await symlink(sentinel, linked);
  await assert.rejects(readAssetSource(linked), /regular files/);
  await unlink(linked);
  await link(sentinel, linked);
  await assert.rejects(readAssetSource(linked), /regular files/);
  await unlink(linked);
  let linkedDirectory = join(fixture.directory, 'linked-directory');
  await symlink(outside, linkedDirectory, 'dir');
  await assert.rejects(readAssetSource(join(linkedDirectory, 'secret.svg')), /symbolic link/);
  let rootPath = definitionPaths('desk').assetsPath;
  await symlink(outside, rootPath, 'dir');
  await assert.rejects(fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
  ]), /symbolic link/);
  await assert.rejects(fixture.run([
    'remove',
    'desk',
    '--path',
    'secret.svg',
  ]), /symbolic link/);
  await unlink(rootPath);
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
  ]);
  await symlink(outside, join(rootPath, 'escape'), 'dir');
  await assert.rejects(fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    'escape/new.svg',
  ]), /symbolic links/);
  await assert.rejects(fixture.run([
    'remove',
    'desk',
    '--path',
    'escape/secret.svg',
  ]), /symbolic link/);
  await unlink(join(rootPath, 'escape'));
  await link(sentinel, join(rootPath, 'hard.svg'));
  await assert.rejects(fixture.run([
    'list',
    'desk',
  ]), /hard links/);
  await assert.rejects(fixture.run([
    'remove',
    'desk',
    '--path',
    'hard.svg',
  ]), /hard links/);
  await unlink(join(rootPath, 'hard.svg'));
  assert.equal(await readFile(sentinel, 'utf8'), 'private bytes');
  await assert.rejects(stat(join(outside, 'new.svg')));
  assert.deepEqual(await readFile(join(rootPath, 'logo.svg')), fixture.bytes);
});

test('asset roots and file identities are rechecked instead of accepting replacements', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
  ]);
  let rootPath = definitionPaths('desk').assetsPath;
  let root = await assetRoot(rootPath);
  assert.ok(root);
  let file = await resolveAssetFile(root, 'logo.svg');
  let before = await assetFileInfo(file);
  await writeFile(file, 'changed');
  await assert.rejects(assertAssetFileUnchanged(file, before), /changed/);
  await rename(rootPath, `${rootPath}-previous`);
  await mkdir(rootPath);
  await assert.rejects(assertAssetRoot(root), /changed/);
  await assert.rejects(resolveAssetFile(root, 'logo.svg'), /changed/);
  assert.equal(await readFile(join(`${rootPath}-previous`, 'logo.svg'), 'utf8'), 'changed');
});

test('source and tree byte limits are bounded, with explicit removal available to repair oversized files', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  let large = join(fixture.directory, 'large.png');
  await writeFile(large, '');
  await truncate(large, ASSET_LIMITS.fileBytes + 1);
  await assert.rejects(fixture.run([
    'add',
    'desk',
    '--file',
    large,
  ]), {
    code: 'INPUT_TOO_LARGE',
  });
  let rootPath = definitionPaths('desk').assetsPath;
  await assert.rejects(stat(rootPath));
  await mkdir(rootPath);
  for (let i = 0; i < ASSET_LIMITS.totalBytes / ASSET_LIMITS.fileBytes; i++) {
    let path = join(rootPath, `${i}.png`);
    let handle = await open(path, 'wx');
    try { await handle.truncate(ASSET_LIMITS.fileBytes); }
    finally { await handle.close(); }
  }
  await assert.rejects(fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
  ]), {
    code: 'INPUT_TOO_LARGE',
  });
  assert.partialDeepStrictEqual(await fixture.run([
    'list',
    'desk',
  ]), {
    totalBytes: ASSET_LIMITS.totalBytes,
  });
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    '0.png',
    '--replace',
  ]);
  await truncate(join(rootPath, '0.png'), ASSET_LIMITS.fileBytes + 1);
  await assert.rejects(fixture.run([
    'list',
    'desk',
  ]), {
    code: 'INPUT_TOO_LARGE',
  });
  await fixture.run([
    'remove',
    'desk',
    '--path',
    '0.png',
  ]);
  assert.equal((await fixture.run([
    'list',
    'desk',
  ])).command, 'assets list');
});

test('inventory and imports enforce file and traversal budgets, including manually created asset trees', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  let rootPath = definitionPaths('desk').assetsPath;
  await mkdir(rootPath);
  for (let i = 0; i < ASSET_LIMITS.files; i++) {
    await writeFile(join(rootPath, `${i}.txt`), '');
  }
  assert.equal((await scanAssets(rootPath)).entries.length, ASSET_LIMITS.files);
  await assert.rejects(fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
  ]), {
    code: 'INPUT_TOO_LARGE',
  });
  await writeFile(join(rootPath, 'extra.txt'), '');
  await assert.rejects(scanAssets(rootPath), {
    code: 'INPUT_TOO_LARGE',
  });
  await fixture.run([
    'remove',
    'desk',
    '--path',
    'extra.txt',
  ]);
  await rm(rootPath, {
    recursive: true,
  });
  await mkdir(rootPath);
  for (let i = 0; i <= ASSET_LIMITS.entries; i++) { await mkdir(join(rootPath, `dir${i}`)); }
  await assert.rejects(scanAssets(rootPath), {
    code: 'INPUT_TOO_LARGE',
  });
});

test('manual hidden or unsupported content fails closed and browser modules are imported as bytes', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  let rootPath = definitionPaths('desk').assetsPath;
  let html = join(fixture.directory, 'page.html');
  await writeFile(html, '<script>throw new Error("must not run")</script>');
  await assert.rejects(fixture.run([
    'add',
    'desk',
    '--file',
    html,
  ]), /Unsupported asset/);
  let script = join(fixture.directory, 'module.html.js');
  let source = 'throw new Error("must never be imported on the server");';
  await writeFile(script, source);
  await fixture.run([
    'add',
    'desk',
    '--file',
    script,
  ]);
  assert.equal(await readFile(join(rootPath, 'module.html.js'), 'utf8'), source);
  await writeFile(join(rootPath, 'page.html'), '<h1>Not published</h1>');
  await assert.rejects(fixture.run([
    'list',
    'desk',
  ]), /Unsupported asset/);
  await fixture.run([
    'remove',
    'desk',
    '--path',
    'page.html',
  ]);
  await mkdir(join(rootPath, '.hidden'));
  await assert.rejects(fixture.run([
    'list',
    'desk',
  ]), /portable relative/);
});
