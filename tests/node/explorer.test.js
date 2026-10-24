import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { cachedDefinitionPaths, getDefaultDefinitionFolder } from '../../src/library/paths.js';
import { connectProject } from '../../src/projects/registry.js';
import { listProjectEntries } from '../../src/projects/explorer/list.js';
import { previewProjectFile } from '../../src/projects/explorer/preview.js';
import { EXPLORER_DIRECTORY_LIMIT, EXPLORER_PAGE_SIZE, EXPLORER_PREVIEW_BYTES } from '../../src/projects/explorer/constants.js';
import { ManagerOperations, validateManagerRequest } from '../../src/manager/operations.js';
import { temporaryState } from './state-fixture.js';
import { MARKDOWN_LIMITS } from '../../src/page/client/uilib/widgets/markdown/constants.js';

/** @param {import('node:test').TestContext} t */
async function fixture(t) {
  let state = await temporaryState();
  let directory = await realpath(await mkdtemp(join(tmpdir(), 'agui-explorer-')));
  t.after(async () => {
    await rm(directory, {
      recursive: true,
      force: true,
    });
    await state.close();
  });
  let folder = join(directory, 'project');
  await mkdir(folder);
  let project = await connectProject(folder);
  return {
    state,
    directory,
    folder,
    id: project.id,
  };
}

test('explorer lists only one directory, pages folders first and hides dependencies until requested', async (t) => {
  let project = await fixture(t);
  await Promise.all([
    mkdir(join(project.folder, 'docs')),
    mkdir(join(project.folder, '.git')),
    mkdir(join(project.folder, 'node_modules')),
    writeFile(join(project.folder, '.env'), 'PRIVATE=fixture'),
    ...Array.from({
      length: EXPLORER_PAGE_SIZE + 2,
    }, (_, index) => writeFile(join(project.folder, `file-${String(index).padStart(3, '0')}.txt`), 'Fixture text.')),
  ]);
  await writeFile(join(project.folder, 'docs', 'nested.md'), '# Nested document');
  let first = await listProjectEntries(project.id);
  assert.equal(first.entries.length, EXPLORER_PAGE_SIZE);
  assert.equal(first.entries[0].name, 'docs');
  assert.equal(first.entries.some((entry) => entry.name === 'nested.md'), false, 'No recursive scan.');
  assert.equal(first.entries.some((entry) => entry.name.startsWith('.') || entry.name === 'node_modules'), false);
  let second = await listProjectEntries(project.id, '', first.nextOffset);
  assert.equal(second.nextOffset, undefined);
  assert.equal(new Set([
    ...first.entries,
    ...second.entries,
  ].map((entry) => entry.path)).size, EXPLORER_PAGE_SIZE + 3);
  let visible = await listProjectEntries(project.id, '', 0, true);
  assert.ok(visible.entries.some((entry) => entry.name === '.git'));
  assert.ok(visible.entries.some((entry) => entry.name === 'node_modules'));
  assert.ok(visible.entries.some((entry) => entry.name === '.env'));
  assert.equal((await listProjectEntries(project.id, 'docs')).entries[0].path, 'docs/nested.md');
  await assert.rejects(previewProjectFile(project.id, '.env'), /Enable hidden/);
  assert.equal((await previewProjectFile(project.id, '.env', true)).text, 'PRIVATE=fixture');
  assert.equal(await readFile(join(project.folder, 'docs', 'nested.md'), 'utf8'), '# Nested document');
});

test('explorer rejects traversal, escaping links, private runtime access and deleted entries', async (t) => {
  let project = await fixture(t);
  let outside = join(project.directory, 'outside.txt');
  await writeFile(outside, 'Outside the project.');
  await mkdir(join(project.folder, 'docs'));
  await writeFile(join(project.folder, 'docs', 'inside.txt'), 'Inside the project.');
  await symlink(outside, join(project.folder, 'escape.txt'), 'file');
  await symlink(join(project.folder, 'docs'), join(project.folder, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  await symlink(project.state.directory, join(project.folder, 'runtime'), process.platform === 'win32' ? 'junction' : 'dir');
  await writeFile(join(project.state.directory, 'token.txt'), 'Private runtime fixture.');
  await assert.rejects(previewProjectFile(project.id, 'escape.txt'), /leaves the connected project/);
  assert.equal((await previewProjectFile(project.id, 'alias/inside.txt')).text, 'Inside the project.');
  await assert.rejects(previewProjectFile(project.id, 'runtime/token.txt', true), /leaves the connected project/);
  for (let path of [
    '../outside.txt',
    '/outside.txt',
    'docs/../../outside.txt',
    'docs\\..\\outside.txt',
    'C:/outside.txt',
    'inside.txt:stream',
    'docs//inside.txt',
    'docs/./inside.txt',
    'bad\0path',
  ]) { await assert.rejects(previewProjectFile(project.id, path)); }
  let entries = await listProjectEntries(project.id);
  assert.equal(entries.entries.find((entry) => entry.path === 'escape.txt')?.kind, 'unavailable');
  await rm(join(project.folder, 'docs', 'inside.txt'));
  await assert.rejects(previewProjectFile(project.id, 'docs/inside.txt'), /ENOENT/);
  let parent = await connectProject(project.directory);
  // The private root is outside this project; put a second runtime root inside it.
  let previous = process.env.AGUI_WORKER_STATE_DIR;
  process.env.AGUI_WORKER_STATE_DIR = join(project.directory, 'private-state');
  try {
    await mkdir(process.env.AGUI_WORKER_STATE_DIR);
    await writeFile(join(process.env.AGUI_WORKER_STATE_DIR, 'session.json'), 'private');
    await assert.rejects(previewProjectFile(parent.id, 'private-state/session.json', true), /Private AGUI runtime/);
    let privateProject = await connectProject(process.env.AGUI_WORKER_STATE_DIR);
    await assert.rejects(listProjectEntries(privateProject.id, '', 0, true), /Private AGUI runtime/);
  } finally {
    if (previous === undefined) { delete process.env.AGUI_WORKER_STATE_DIR; }
    else { process.env.AGUI_WORKER_STATE_DIR = previous; }
  }
});

test('Default exposes readable definition names only and never runtime records or arbitrary cache files', async (t) => {
  let project = await fixture(t);
  assert.deepEqual((await listProjectEntries('default')).entries, []);
  let paths = cachedDefinitionPaths('demo-desk');
  await mkdir(getDefaultDefinitionFolder());
  await Promise.all([
    writeFile(paths.htmlPath, '<agui-field label="Fixture"></agui-field>'),
    writeFile(paths.descriptionPath, '# Demo desk'),
    writeFile(join(getDefaultDefinitionFolder(), 'session.json'), 'private'),
    writeFile(join(getDefaultDefinitionFolder(), 'not-encoded.html'), '<h1>Ignore</h1>'),
    writeFile(join(project.state.directory, 'session.json'), 'private'),
  ]);
  let listing = await listProjectEntries('default', '', 0, true);
  assert.deepEqual(listing.entries.map((entry) => entry.name), [
    'demo-desk.html',
    'demo-desk.md',
  ]);
  assert.equal((await previewProjectFile('default', 'demo-desk.md')).kind, 'markdown');
  assert.equal((await previewProjectFile('default', 'demo-desk.html')).text, '<agui-field label="Fixture"></agui-field>');
  for (let path of [
    'session.json',
    '../session.json',
    'not-encoded.html',
    'demo-desk/other.html',
  ]) { await assert.rejects(previewProjectFile('default', path, true)); }
  await symlink(join(project.state.directory, 'session.json'), cachedDefinitionPaths('escape').htmlPath, 'file');
  await assert.rejects(previewProjectFile('default', 'escape.html'), /leaves the connected project/);
});

test('previews bound reads, distinguish unsupported content and report permissions or scan limits', async (t) => {
  let project = await fixture(t);
  await Promise.all([
    writeFile(join(project.folder, 'code.html'), '<script>throw new Error("never execute")</script>'),
    writeFile(join(project.folder, 'large.txt'), 'x'.repeat(EXPLORER_PREVIEW_BYTES + 1)),
    writeFile(join(project.folder, 'large.md'), 'x'.repeat(MARKDOWN_LIMITS.inputBytes + 1)),
    writeFile(join(project.folder, 'image.png'), Buffer.from([
      137,
      80,
      78,
      71,
    ])),
    writeFile(join(project.folder, 'binary.txt'), Buffer.from([
      0,
      255,
    ])),
  ]);
  assert.equal((await previewProjectFile(project.id, 'code.html')).kind, 'text');
  assert.equal((await previewProjectFile(project.id, 'large.txt')).kind, 'too-large');
  assert.equal((await previewProjectFile(project.id, 'large.md')).kind, 'too-large');
  assert.equal((await previewProjectFile(project.id, 'image.png')).kind, 'unsupported');
  assert.equal((await previewProjectFile(project.id, 'binary.txt')).kind, 'unsupported');
  if (process.platform !== 'win32' && process.getuid?.() !== 0) {
    let blocked = join(project.folder, 'blocked.txt');
    await writeFile(blocked, 'Unreadable fixture.');
    await chmod(blocked, 0);
    try { await assert.rejects(previewProjectFile(project.id, 'blocked.txt'), /EACCES/); }
    finally { await chmod(blocked, 0o600); }
    let directory = join(project.folder, 'unreadable');
    await mkdir(directory);
    await chmod(directory, 0);
    try { await assert.rejects(listProjectEntries(project.id, 'unreadable'), /EACCES/); }
    finally { await chmod(directory, 0o700); }
  }
  let huge = join(project.folder, 'huge');
  await mkdir(huge);
  for (let index = 0; index <= EXPLORER_DIRECTORY_LIMIT; index += 100) {
    await Promise.all(Array.from({
      length: Math.min(100, EXPLORER_DIRECTORY_LIMIT + 1 - index),
    }, (_, offset) => writeFile(join(huge, `entry-${index + offset}.txt`), '')));
  }
  await assert.rejects(listProjectEntries(project.id, 'huge'), /browsing limit/);
});

test('manager explorer requests validate their targets and read through the authenticated operation catalog', async (t) => {
  let project = await fixture(t);
  await writeFile(join(project.folder, 'data.json'), '{"fixture":true}');
  let operations = new ManagerOperations();
  let listed = await operations.dispatch({
    id: 'list',
    operation: 'project entries',
    projectId: project.id,
    path: '',
  });
  assert.equal(listed.ok, true, listed.error?.message);
  assert.equal(listed.directory?.entries[0].name, 'data.json');
  let preview = await operations.dispatch({
    id: 'preview',
    operation: 'project preview',
    projectId: project.id,
    path: 'data.json',
  });
  assert.equal(preview.preview?.text, '{"fixture":true}');
  for (let input of [
    {
      operation: 'project entries',
      projectId: project.id,
      offset: -1,
    },
    {
      operation: 'project entries',
      projectId: project.id,
      path: null,
    },
    {
      operation: 'project preview',
      projectId: project.id,
      path: 'data.json',
      offset: 0,
    },
    {
      operation: 'project entries',
      projectId: project.id,
      showHidden: 'yes',
    },
    {
      operation: 'snapshot',
      path: 'data.json',
    },
    {
      operation: 'open folder',
      projectId: project.id,
      path: 'data.json',
    },
  ]) { assert.throws(() => validateManagerRequest({
    id: 'invalid',
    ...input,
  })); }
});
