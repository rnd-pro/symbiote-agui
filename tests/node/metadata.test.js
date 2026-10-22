import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseCommand } from '../../src/cli/parse.js';
import { prepareCachedMarkup, cachePath } from '../../src/sessions/cache.js';
import { prepareTextFile } from '../../src/library/files.js';
import { getStateRoot } from '../../src/sessions/store.js';
import { stopSession } from '../../src/sessions/lifecycle.js';
import { metadataPath, readMetadata } from '../../src/metadata/store.js';
import { validateMetadata } from '../../src/metadata/validate.js';
import { setSessionMetadata, getSessionMetadata } from '../../src/metadata/service.js';
import { METADATA_LIMITS } from '../../src/metadata/constants.js';
import { ManagerOperations } from '../../src/manager/operations.js';
import { temporaryState } from './state-fixture.js';
import { sampleMetadata } from './metadata-fixture.js';

let cliPath = fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url));

/**
 * @param {string[]} args
 * @param {string} [input]
 */
async function cli(args, input) {
  let stdout = await new Promise((resolve, reject) => {
    let child = execFile(process.execPath, [cliPath, ...args], { timeout: 45_000 }, (error, output) => {
      error ? reject(Object.assign(error, { stdout: output })) : resolve(output);
    });
    child.stdin?.end(input);
  });
  return JSON.parse(stdout);
}

/** @param {string} id */
async function save(id) {
  let pending = await prepareCachedMarkup(id, '<p>Inventory fixture</p>', '# Inventory\n\nFixture description.\n');
  try { await pending.commit(); }
  finally { await pending.discard(); }
}

test('metadata commands admit only their own options and validated session IDs', () => {
  assert.deepEqual(parseCommand(['metadata', 'get', 'desk']), { kind: 'metadata', command: 'get', sessionId: 'desk' });
  assert.deepEqual(parseCommand(['metadata', 'set', 'desk']), { kind: 'metadata', command: 'set', sessionId: 'desk', file: undefined });
  assert.partialDeepStrictEqual(parseCommand(['metadata', 'set', 'desk', '--file', 'metadata.json']), { file: 'metadata.json' });
  assert.deepEqual(parseCommand(['metadata', 'clear', 'desk', '--key', 'dataFlow']), { kind: 'metadata', command: 'clear', sessionId: 'desk', key: 'dataFlow' });
  for (let args of [
    ['metadata'], ['metadata', 'get'], ['metadata', 'other', 'desk'], ['metadata', 'get', '../escape'],
    ['metadata', 'get', 'desk', '--file', 'x'], ['metadata', 'get', 'desk', '--key', 'dataFlow'],
    ['metadata', 'set', 'desk', '--key', 'dataFlow'], ['metadata', 'set', 'desk', '--file', ''],
    ['metadata', 'clear', 'desk'], ['metadata', 'clear', 'desk', '--key', 'controlToken'],
    ['metadata', 'clear', 'desk', '--key', 'dataFlow', '--file', 'x'],
    ['metadata', 'get', 'desk', 'extra'], ['start', 'desk', '--key', 'dataFlow'],
  ]) { assert.throws(() => parseCommand(args), { code: 'INVALID_INPUT' }); }
});

test('metadata validation bounds descriptive fields and rejects runtime settings, records, and credential URLs', () => {
  let good = sampleMetadata();
  assert.deepEqual(validateMetadata(good), good);
  assert.deepEqual(validateMetadata({}), {});
  let invalid = [null, [], { command: 'run' }, { dataFlow: null }, { dataFlow: {} },
    { dataFlow: { ...good.dataFlow, records: [] } },
    { dataFlow: { ...good.dataFlow, initialSource: { kind: 'unknown', description: 'Source' } } },
    { dataFlow: { ...good.dataFlow, targets: [] } },
    { dataFlow: { ...good.dataFlow, bindings: [{ provider: 'APP', keys: ['__proto__'] }] } },
    { dataFlow: { ...good.dataFlow, bindings: [{ provider: 'APP', keys: ['name', 'name'] }] } },
    { dataFlow: { ...good.dataFlow, bindings: [{ provider: 'APP', keys: ['name'] }, { provider: 'APP', keys: ['other'] }] } },
    JSON.parse('{"__proto__":{}}'),
  ];
  for (let reference of ['https://user:pass@example.test/data', 'https://example.test/data?token=secret',
    'https://example.test/data#secret', 'postgresql://user:pass@example.test/db']) {
    invalid.push({ dataFlow: { ...good.dataFlow, initialSource: { kind: 'api', description: 'Source', reference } } });
  }
  for (let input of invalid) { assert.throws(() => validateMetadata(input), { code: 'INVALID_INPUT' }); }
  assert.throws(() => validateMetadata({ dataFlow: { ...good.dataFlow,
    targets: Array.from({ length: 16 }, () => ({ kind: 'manual', description: 'x'.repeat(2048) })) } }), /16 KiB/);
});

test('metadata CLI updates private discovery without changing markup, descriptions, or application data', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await save('desk');
  let html = await readFile(cachePath('desk'), 'utf8');
  let before = await cli(['describe', 'desk']);
  let metadata = sampleMetadata();
  let file = join(state.directory, 'metadata.json');
  await writeFile(file, JSON.stringify(metadata));
  assert.deepEqual((await cli(['metadata', 'get', 'desk'])).metadata, {});
  assert.deepEqual((await cli(['metadata', 'set', 'desk', '--file', file])).metadata, metadata);
  assert.deepEqual((await cli(['metadata', 'set', 'desk'], '{}')).metadata, metadata, 'An omitted field is retained.');
  let described = await cli(['describe', 'desk']);
  assert.deepEqual(described.metadata, metadata);
  assert.equal(described.description, before.description);
  assert.equal(await readFile(cachePath('desk'), 'utf8'), html);
  let found = await cli(['list', '--query', 'DEMO.INVENTORY']);
  assert.equal(found.total, 1);
  assert.match(found.definitions[0].dataFlowSummary, /sample-inventory.json/);
  assert.equal(found.definitions[0].metadata, undefined, 'Discovery lists summaries, not complete metadata.');
  let manager = new ManagerOperations();
  assert.deepEqual((await manager.snapshot()).sessions[0].definition?.metadata, metadata);
  assert.deepEqual((await manager.dispatch({ id: 'description', operation: 'describe', sessionId: 'desk' })).description?.metadata, metadata);
  if (process.platform !== 'win32') { assert.equal((await stat(metadataPath('desk'))).mode & 0o777, 0o600); }
  for (let input of ['{broken', '{"controlToken":"no"}', JSON.stringify({ dataFlow: { targets: [] } }), ' '.repeat(METADATA_LIMITS.bytes + 1)]) {
    await assert.rejects(cli(['metadata', 'set', 'desk'], input));
    assert.deepEqual((await cli(['metadata', 'get', 'desk'])).metadata, metadata);
  }
  assert.deepEqual((await cli(['metadata', 'clear', 'desk', '--key', 'dataFlow'])).metadata, {});
  assert.equal(await readFile(cachePath('desk'), 'utf8'), html);
  assert.equal((await cli(['describe', 'desk'])).description, before.description);
  assert.equal((await cli(['list', '--query', 'demo.inventory'])).total, 0);
});

test('metadata changes preserve a live worker, survive stop/start, and clear with the session', { timeout: 40_000 }, async (t) => {
  let state = await temporaryState();
  t.after(async () => { await stopSession('desk'); await state.close(); });
  await save('desk');
  await cli(['start', 'desk', '--no-open']);
  let started = await cli(['status', 'desk']);
  let metadata = sampleMetadata();
  await cli(['metadata', 'set', 'desk'], JSON.stringify(metadata));
  let running = await cli(['status', 'desk']);
  assert.equal(running.pid, started.pid);
  assert.equal(running.url, started.url);
  assert.deepEqual((await cli(['events', 'desk'])).events, []);
  await cli(['stop', 'desk']);
  assert.deepEqual((await cli(['metadata', 'get', 'desk'])).metadata, metadata);
  await cli(['start', 'desk', '--no-open']);
  assert.deepEqual((await cli(['metadata', 'get', 'desk'])).metadata, metadata);
  await cli(['clear', 'desk']);
  assert.deepEqual(await readMetadata('desk'), {});
  await assert.rejects(cli(['metadata', 'get', 'desk']));
  await save('desk');
  await setSessionMetadata('desk', metadata);
  await cli(['stop', 'desk']);
  await cli(['clear', 'desk']);
  assert.deepEqual(await readMetadata('desk'), {});
});

test('metadata follows private storage and library namespaces, without implicit team export', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await save('desk');
  await save('Desk');
  await setSessionMetadata('desk', sampleMetadata());
  assert.deepEqual((await getSessionMetadata('Desk')).metadata, {});
  let privatePath = metadataPath('desk');
  let privateRoot = getStateRoot();
  let source = cachePath('desk');
  for (let name of ['first', 'second']) {
    let folder = join(state.directory, name);
    await mkdir(folder);
    await copyFile(source, join(folder, 'desk.html'));
    process.env.AGUI_LIBRARY_DIR = folder;
    assert.notEqual(getStateRoot(), privateRoot);
    assert.deepEqual((await getSessionMetadata('desk')).metadata, {});
    await setSessionMetadata('desk', sampleMetadata());
    assert.notEqual(metadataPath('desk'), privatePath);
    assert.deepEqual(await readdir(folder), ['desk.html'], 'Metadata never appears in the team source folder.');
  }
  process.env.AGUI_LIBRARY_DIR = '';
  assert.equal(metadataPath('desk'), privatePath);
  assert.deepEqual((await getSessionMetadata('desk')).metadata, sampleMetadata());
});

test('missing sessions and corrupt metadata fail explicitly; stale prepared updates preserve newer files', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  await assert.rejects(setSessionMetadata('missing', sampleMetadata()), /No saved AGUI/);
  assert.deepEqual(await readdir(state.directory), []);
  await save('desk');
  await setSessionMetadata('desk', sampleMetadata());
  let path = metadataPath('desk');
  let before = await readFile(path, 'utf8');
  let pending = await prepareTextFile(path, '{}\n', { text: before });
  await writeFile(path, '{"dataFlow":null}');
  await assert.rejects(pending.commit(), /file changed/);
  await pending.discard();
  await assert.rejects(getSessionMetadata('desk'), { code: 'CACHE_ERROR' });
  assert.equal(await readFile(path, 'utf8'), '{"dataFlow":null}');
  await assert.rejects(prepareTextFile(path, '{}\n', { text: before }), /file changed/);
  await writeFile(path, ' '.repeat(METADATA_LIMITS.bytes + 1));
  await assert.rejects(getSessionMetadata('desk'), { code: 'CACHE_ERROR' });
  assert.match(await readFile(cachePath('desk'), 'utf8'), /Inventory fixture/);
});
