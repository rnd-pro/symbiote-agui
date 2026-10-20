import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { getSettings } from '../../src/config/settings.js';
import { cachePath, prepareCachedMarkup, readCachedMarkup } from '../../src/sessions/cache.js';
import { listSessionIds } from '../../src/sessions/list.js';
import { readSession } from '../../src/sessions/store.js';
import { requestSession } from '../../src/sessions/client.js';
import { parseCommand } from '../../src/cli/parse.js';
import { temporaryState } from './state-fixture.js';

let execute = promisify(execFile);
let cliPath = fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url));

/**
 * @param {string[]} args
 * @param {string} [cwd]
 */
async function cli(args, cwd) {
  let { stdout } = await execute(process.execPath, [cliPath, ...args], { cwd, timeout: 45_000 });
  return JSON.parse(stdout);
}

test('library CLI parses configuration, discovery, and definition management without leaking options', () => {
  assert.deepEqual(parseCommand(['config', 'folder', './team aguis']), { kind: 'library', command: 'config folder', folder: './team aguis' });
  assert.deepEqual(parseCommand(['list', '--query', 'leads']), { kind: 'library', command: 'list', query: 'leads' });
  assert.partialDeepStrictEqual(parseCommand(['describe', 'desk', '--file', 'desk.md']), { command: 'describe', file: 'desk.md' });
  assert.partialDeepStrictEqual(parseCommand(['save', 'desk']), { command: 'save' });
  assert.deepEqual(parseCommand(['sync', 'all']), { kind: 'all', command: 'sync all' });
  for (let args of [
    ['config', 'folder'],
    ['config', 'show', 'extra'],
    ['config', 'reset', '--file', 'x'],
    ['list', 'extra'],
    ['list', '--query', ''],
    ['save', '../escape'],
    ['sync', 'desk', '--file', 'x'],
    ['sync', 'all', '--no-open'],
  ]) { assert.throws(() => parseCommand(args), { code: 'INVALID_INPUT' }); }
});

test('project config uses portable relative folders, nearest discovery, overrides, reset, and explicit errors', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  delete process.env.AGUI_LIBRARY_DIR;
  let project = join(state.directory, 'project');
  let child = join(project, 'nested');
  await mkdir(child, { recursive: true });
  let configured = await cli(['config', 'folder', './aguis'], project);
  assert.equal(configured.settings.folder, join(project, 'aguis'));
  assert.deepEqual(JSON.parse(await readFile(join(project, '.agui.json'), 'utf8')), { folder: 'aguis' });
  assert.equal((await cli(['config', 'show'], child)).settings.folder, configured.settings.folder);
  process.env.AGUI_LIBRARY_DIR = join(state.directory, 'override');
  assert.equal((await cli(['config', 'show'], child)).settings.source, 'environment');
  assert.equal(getSettings().folder, process.env.AGUI_LIBRARY_DIR);
  delete process.env.AGUI_LIBRARY_DIR;
  assert.equal((await cli(['config', 'reset'], child)).settings.mode, 'cache');
  await writeFile(join(project, '.agui.json'), '{invalid');
  await assert.rejects(cli(['config', 'show'], project), (error) => {
    assert.equal(JSON.parse(/** @type {Error & { stdout: string }} */ (error).stdout).error.code, 'CONFIG_ERROR');
    return true;
  });
});

test('folder definitions are discoverable, preserve Markdown, restore in another checkout, and sync without rewriting source', async (t) => {
  let state = await temporaryState();
  let first = join(state.directory, 'first');
  let second = join(state.directory, 'second');
  t.after(async () => {
    for (let folder of [first, second]) {
      process.env.AGUI_LIBRARY_DIR = folder;
      await cli(['stop', 'leads']).catch(() => {});
    }
    await state.close();
  });
  process.env.AGUI_LIBRARY_DIR = first;
  let source = join(state.directory, 'input.html');
  let description = join(state.directory, 'description.md');
  await writeFile(source, '<p class="w-[321px]">Team leads</p>');
  await writeFile(description, '# Sales pipeline\n\nQualify leads and prepare outreach.\n\n## Data\n\nUses synthetic sample data.\n');
  let saved = await cli(['save', 'leads', '--file', source]);
  assert.equal(saved.htmlPath, join(first, 'leads.html'));
  assert.match(saved.description, /# leads/);
  await cli(['describe', 'leads', '--file', description]);
  await cli(['save', 'leads', '--file', source]);
  assert.equal((await cli(['describe', 'leads'])).title, 'Sales pipeline');
  assert.equal((await cli(['list', '--query', 'outreach'])).total, 1);
  assert.equal((await cli(['list', '--query', 'missing'])).total, 0);
  assert.deepEqual(await listSessionIds(true), ['leads']);
  assert.equal((await cli(['status', 'all'])).sessions[0].active, false);
  let running = await cli(['start', 'leads', '--no-open']);
  assert.equal(running.restored, true);
  let original = await readSession('leads');
  await mkdir(second);
  await copyFile(join(first, 'leads.html'), join(second, 'leads.html'));
  await copyFile(join(first, 'leads.md'), join(second, 'leads.md'));
  process.env.AGUI_LIBRARY_DIR = second;
  assert.equal((await cli(['status', 'leads'])).state, 'stopped');
  let other = await cli(['start', 'leads', '--no-open']);
  assert.equal(other.restored, true);
  let secondRecord = await readSession('leads');
  assert.ok(secondRecord);
  assert.notEqual(secondRecord.pid, original?.pid);
  let updated = '<p class="w-[713px]">Updated after team pull</p>';
  await writeFile(join(second, 'leads.html'), updated);
  let before = await stat(join(second, 'leads.html'));
  let synced = await cli(['sync', 'leads']);
  assert.equal(synced.synced, true);
  assert.equal(synced.delivery, 'queued');
  assert.equal((await readSession('leads'))?.instanceId, secondRecord.instanceId);
  assert.match(await (await fetch(new URL('/styles.css.js', other.url))).text(), /713px/);
  assert.equal(await readFile(join(second, 'leads.html'), 'utf8'), updated);
  assert.equal((await stat(join(second, 'leads.html'))).mtimeMs, before.mtimeMs);
  let bad = '<agui-component><script type="application/json">{broken}</script></agui-component>';
  await writeFile(join(second, 'leads.html'), bad);
  await assert.rejects(cli(['sync', 'leads']));
  assert.equal(await readFile(join(second, 'leads.html'), 'utf8'), bad);
  assert.match(await (await fetch(new URL('/styles.css.js', other.url))).text(), /713px/);
  await writeFile(join(second, 'leads.html'), updated);
  assert.equal((await cli(['sync', 'all'])).sessions[0].synced, true);
  process.env.AGUI_LIBRARY_DIR = first;
  await requestSession(secondRecord, 'insert', 5_000, '<p>Pinned worker folder</p>');
  assert.equal(await readFile(join(second, 'leads.html'), 'utf8'), '<p>Pinned worker folder</p>');
  assert.equal(await readFile(join(first, 'leads.html'), 'utf8'), '<p class="w-[321px]">Team leads</p>');
  assert.deepEqual((await readdir(first)).sort(), ['leads.html', 'leads.md']);
  assert.deepEqual((await readdir(second)).sort(), ['leads.html', 'leads.md']);
  assert.equal((await cli(['list'])).definitions[0].title, 'Sales pipeline');
});

test('saving imports private cache explicitly, rejects conflicting edits and case collisions, and clear removes definitions', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let pending = await prepareCachedMarkup('desk', '<p>Private cache</p>', '# Existing task\n\nPreserve team knowledge.\n');
  await pending.commit();
  await pending.discard();
  let oldPath = cachePath('desk');
  process.env.AGUI_LIBRARY_DIR = join(state.directory, 'team');
  assert.equal((await cli(['list'])).total, 0);
  await cli(['save', 'desk']);
  assert.equal((await cli(['describe', 'desk'])).title, 'Existing task');
  assert.equal(await readCachedMarkup('desk'), '<p>Private cache</p>');
  assert.equal(await readFile(oldPath, 'utf8'), '<p>Private cache</p>');
  let staged = await prepareCachedMarkup('desk', '<p>Agent update</p>');
  await writeFile(cachePath('desk'), '<p>Team update</p>');
  await assert.rejects(staged.commit(), /file changed/);
  await staged.discard();
  assert.equal(await readCachedMarkup('desk'), '<p>Team update</p>');
  await assert.rejects(prepareCachedMarkup('Desk', 'collision'), /conflicts/);
  await assert.rejects(readCachedMarkup('Desk'), /conflicts/);
  assert.equal(await readCachedMarkup('desk'), '<p>Team update</p>');
  let bad = join(state.directory, 'bad.html');
  await writeFile(bad, '<agui-component><script type="application/json">null</script></agui-component>');
  await assert.rejects(cli(['save', 'invalid', '--file', bad]));
  assert.equal((await cli(['list'])).total, 1);
  await cli(['clear', 'desk']);
  assert.deepEqual(await readdir(process.env.AGUI_LIBRARY_DIR), []);
  process.env.AGUI_LIBRARY_DIR = '';
  assert.equal(await readCachedMarkup('desk'), '<p>Private cache</p>');
});
