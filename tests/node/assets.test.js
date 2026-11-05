import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { assetFixture } from './assets-fixture.js';
import { temporaryManagerProject } from './manager-storage-fixture.js';
import { parseCommand } from '../../src/cli/parse.js';
import { definitionPaths, assertPortableName } from '../../src/library/paths.js';
import { prepareCachedMarkup } from '../../src/sessions/cache.js';
import { readSession } from '../../src/sessions/store.js';
import { prepareRuntimeCache, runtimeCachePath } from '../../src/data/cache.js';
import { ASSET_LIMITS } from '../../src/assets/constants.js';

test('asset commands validate their exact options and portable paths without leaking flags to other commands', () => {
  assert.deepEqual(parseCommand([
    'assets',
    'add',
    'desk',
    '--file',
    './source.svg',
    '--as',
    'images/logo.svg',
    '--replace',
  ]), {
    kind: 'assets',
    command: 'add',
    sessionId: 'desk',
    file: './source.svg',
    path: 'images/logo.svg',
    replace: true,
  });
  assert.partialDeepStrictEqual(parseCommand([
    'assets',
    'list',
    'desk',
  ]), {
    offset: 0,
    limit: ASSET_LIMITS.pageSize,
  });
  assert.partialDeepStrictEqual(parseCommand([
    'assets',
    'list',
    'desk',
    '--offset',
    '2',
    '--limit',
    '5',
  ]), {
    offset: 2,
    limit: 5,
  });
  for (let args of [
    [
      'assets',
    ],
    [
      'assets',
      'add',
      'desk',
    ],
    [
      'assets',
      'add',
      'desk',
      '--file',
      '',
    ],
    [
      'assets',
      'add',
      'desk',
      '--file',
      'x',
      '--path',
      'x',
    ],
    [
      'assets',
      'list',
      'desk',
      '--limit',
      '0',
    ],
    [
      'assets',
      'list',
      'desk',
      '--limit',
      '101',
    ],
    [
      'assets',
      'list',
      'desk',
      '--offset',
      '-1',
    ],
    [
      'assets',
      'list',
      'desk',
      '--offset',
      '1.5',
    ],
    [
      'assets',
      'list',
      'desk',
      '--offset',
      '9007199254740992',
    ],
    [
      'assets',
      'list',
      'desk',
      '--replace',
    ],
    [
      'assets',
      'remove',
      'desk',
    ],
    [
      'assets',
      'remove',
      'desk',
      '--path',
      'x.svg',
      '--file',
      'x',
    ],
    [
      'assets',
      'list',
      '../desk',
    ],
    [
      'assets',
      'list',
      'desk',
      'extra',
    ],
    [
      'save',
      'desk',
      '--replace',
    ],
    [
      'start',
      'desk',
      '--as',
      'x',
    ],
    [
      'list',
      '--limit',
      '5',
    ],
  ]) { assert.throws(() => parseCommand(args), {
    code: 'INVALID_INPUT',
  }); }
  for (let path of [
    '../outside.svg',
    '/logo.svg',
    'a//b.svg',
    './logo.svg',
    '.env',
    'a/.hidden.svg',
    'C:/logo.svg',
    'a\\b.svg',
    'a/%2e%2e/b.svg',
    'a%252fb.svg',
    'logo.svg?x',
    'logo.svg#x',
    'a\u0000.svg',
    'CON.svg',
    'a/AUX.txt',
    'x./logo.svg',
    'x /logo.svg',
    'x'.repeat(ASSET_LIMITS.segmentLength + 1),
    [
      ...Array(ASSET_LIMITS.depth).fill('a'),
      'logo.svg',
    ].join('/'),
  ]) { assert.throws(() => parseCommand([
    'assets',
    'remove',
    'desk',
    '--path',
    path,
  ]), {
    code: 'INVALID_INPUT',
  }, path); }
});

test('assets preserve original bytes, require explicit replacement, paginate, and remove only owned files', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  let paths = definitionPaths('desk');
  assert.match(paths.assetsPath, /\.cache\/6465736b\.assets$/);
  let before = await readFile(paths.htmlPath);
  let description = await readFile(paths.descriptionPath);
  assert.partialDeepStrictEqual(await fixture.run([
    'list',
    'desk',
  ]), {
    total: 0,
    totalBytes: 0,
    assets: [],
  });
  await assert.rejects(stat(paths.assetsPath));
  let added = await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    'images/logo dark.svg',
  ]);
  assert.partialDeepStrictEqual(added, {
    replaced: false,
    asset: {
      path: 'images/logo dark.svg',
      contentType: 'image/svg+xml',
      url: './_assets/images/logo%20dark.svg',
    },
  });
  let destination = join(paths.assetsPath, 'images/logo dark.svg');
  assert.deepEqual(await readFile(destination), fixture.bytes);
  await assert.rejects(fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    'images/logo dark.svg',
  ]), /--replace/);
  let replacement = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(fixture.source, replacement);
  assert.deepEqual(await readFile(destination), fixture.bytes, 'Import is a copy, not a mount.');
  assert.partialDeepStrictEqual(await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    'images/logo dark.svg',
    '--replace',
  ]), {
    replaced: true,
  });
  assert.deepEqual(await readFile(destination), replacement);
  let binary = join(fixture.directory, 'image.png');
  let binaryBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0, 0xff, 0xfe, 0x80,
  ]);
  await writeFile(binary, binaryBytes);
  await fixture.run([
    'add',
    'desk',
    '--file',
    binary,
  ]);
  assert.deepEqual(await readFile(join(paths.assetsPath, 'image.png')), binaryBytes);
  let page = await fixture.run([
    'list',
    'desk',
    '--offset',
    '1',
    '--limit',
    '1',
  ]);
  assert.partialDeepStrictEqual(page, {
    total: 2,
    totalBytes: binaryBytes.length + replacement.length,
    offset: 1,
    limit: 1,
    assets: [
      {
        path: 'images/logo dark.svg',
        size: replacement.length,
        contentType: 'image/svg+xml',
        url: './_assets/images/logo%20dark.svg',
      },
    ],
  });
  assert.doesNotMatch(JSON.stringify(page), new RegExp(fixture.directory));
  await fixture.run([
    'remove',
    'desk',
    '--path',
    'images/logo dark.svg',
  ]);
  await assert.rejects(stat(join(paths.assetsPath, 'images')));
  assert.deepEqual(await readFile(fixture.source), replacement);
  assert.deepEqual(await readFile(paths.htmlPath), before);
  assert.deepEqual(await readFile(paths.descriptionPath), description);
  assert.equal(await readSession('desk'), undefined, 'File operations do not start a worker.');
  assert.deepEqual(await readdir(paths.assetsPath), [
    'image.png',
  ]);
  let longestName = `${'a'.repeat(ASSET_LIMITS.segmentLength - 4)}.svg`;
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    longestName,
  ]);
  assert.deepEqual(await readFile(join(paths.assetsPath, longestName)), replacement);
});

test('same-session asset mutations serialize and reject portable file and directory collisions', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  let results = await Promise.allSettled(Array.from({
    length: 3,
  }, () => fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
  ])));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    'Images/logo.svg',
  ]);
  for (let path of [
    'Logo.svg',
    'images/new.svg',
    'Images',
    'logo.svg/other.svg',
  ]) { await assert.rejects(fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    path,
  ])); }
  assert.partialDeepStrictEqual(await fixture.run([
    'list',
    'desk',
  ]), {
    total: 2,
  });
});

test('asset directories are scoped to saved project definitions and default caching', async (t) => {
  let fixture = await assetFixture();
  t.after(() => fixture.close());
  let cached = definitionPaths('desk').assetsPath;
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
  ]);
  let folder = join(fixture.directory, 'library');
  await mkdir(folder);
  process.env.AGUI_LIBRARY_DIR = folder;
  await assert.rejects(fixture.run([
    'list',
    'desk',
  ]), /saved AGUI/);
  let pending = await prepareCachedMarkup('desk', '<p>Project definition</p>');
  try { await pending.commit(); }
  finally { await pending.discard(); }
  assert.equal(definitionPaths('desk').assetsPath, join(folder, 'desk.assets'));
  assert.partialDeepStrictEqual(await fixture.run([
    'list',
    'desk',
  ]), {
    total: 0,
  });
  await fixture.run([
    'add',
    'desk',
    '--file',
    fixture.source,
    '--as',
    'project.svg',
  ]);
  assert.deepEqual(await readdir(cached), [
    'logo.svg',
  ]);
  assert.deepEqual(await readdir(definitionPaths('desk').assetsPath), [
    'project.svg',
  ]);
  await mkdir(join(folder, 'Other.assets'));
  await assert.rejects(assertPortableName('other'), /conflicts/);
  let second = await prepareCachedMarkup('other', '<p>Must fail</p>').catch(() => undefined);
  assert.equal(second, undefined);
});

test('real CLI manages stopped and running assets without changing worker state, descriptions, or committed data', {
  timeout: 60_000,
}, async (t) => {
  let project = await temporaryManagerProject();
  t.after(() => project.close());
  let html = join(project.directory, 'input.html');
  let source = join(project.directory, 'logo.svg');
  await writeFile(html, '<p>CLI assets</p>');
  await writeFile(source, '<svg/>');
  await project.cli([
    'save',
    'desk',
    '--file',
    html,
  ], '');
  let paths = definitionPaths('desk');
  let saved = await prepareRuntimeCache('desk', '<p>CLI assets</p>', '<p>CLI assets</p>', randomUUID(), undefined);
  try { await saved.commit(); }
  finally { await saved.discard(); }
  let originalData = await readFile(runtimeCachePath('desk'));
  let originalDescription = await readFile(paths.descriptionPath);
  await project.cli([
    'assets',
    'add',
    'desk',
    '--file',
    source,
  ], '');
  assert.equal((await project.cli([
    'assets',
    'list',
    'desk',
  ], '')).total, 1);
  assert.equal((await project.cli([
    'status',
    'desk',
  ], '')).active, false);
  await project.cli([
    'start',
    'desk',
    '--no-open',
  ], '');
  let before = await readSession('desk');
  assert.ok(before);
  await project.cli([
    'assets',
    'add',
    'desk',
    '--file',
    source,
    '--as',
    'live.svg',
  ], '');
  await project.cli([
    'assets',
    'remove',
    'desk',
    '--path',
    'logo.svg',
  ], '');
  assert.deepEqual(await readSession('desk'), before);
  assert.deepEqual(await readFile(runtimeCachePath('desk')), originalData);
  assert.deepEqual(await readFile(paths.descriptionPath), originalDescription);
  assert.equal((await fetch(new URL('_assets/live.svg', before.url))).status, 404, 'HTTP serving belongs to step 2.');
  await assert.rejects(project.cli([
    'assets',
    'add',
    'desk',
    '--file',
    source,
    '--as',
    'live.svg',
  ], ''), (error) => {
    let output = JSON.parse(/** @type {Error & { stdout: string }} */ (error).stdout);
    assert.equal(output.ok, false);
    assert.equal(output.error.code, 'INVALID_INPUT');
    return true;
  });
});
