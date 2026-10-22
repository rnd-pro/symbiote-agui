import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { SessionRuntime } from '../../src/sessions/runtime.js';
import { prepareCachedMarkup, cachePath, readCachedMarkup } from '../../src/sessions/cache.js';
import { readRuntimeCache, runtimeCachePath, prepareRuntimeCache } from '../../src/data/cache.js';
import { declaredData, patchData } from '../../src/data/markup.js';
import { analyzeMarkup } from '../../src/markup/analyze.js';
import { validateDataCommit } from '../../src/data/validate.js';
import { DATA_LIMITS } from '../../src/data/constants.js';
import { temporaryState } from './state-fixture.js';
import { dataHtml, dataCommit } from './data-fixture.js';

/** @param {import('node:test').TestContext} t */
async function setup(t) {
  let state = await temporaryState();
  let runtime = makeRuntime();
  t.after(async () => { await runtime.close(); await state.close(); });
  await save(dataHtml);
  await runtime.start(new AbortController().signal);
  return { runtime, state };
}

function makeRuntime() {
  return new SessionRuntime({ sessionId: 'data-fixture', instanceId: randomUUID(), controlToken: '',
    pid: process.pid, launcherPid: process.pid });
}

/** @param {string} html */
async function save(html) {
  let pending = await prepareCachedMarkup('data-fixture', html);
  try { await pending.commit(); } finally { await pending.discard(); }
}

/**
 * @param {SessionRuntime} runtime
 * @param {import('../../types/data.js').DataCommit} input
 * @returns {Promise<import('../../types/data.js').DataResult>}
 */
async function commit(runtime, input) {
  return new Promise((resolve) => {
    /** @param {import('../../types/data.js').DataResult} result */
    let done = (result) => {
      if (result.commitId !== input.commitId) { return; }
      runtime.data.off('result', done);
      resolve(result);
    };
    runtime.data.on('result', done);
    let initial = runtime.data.submit(input);
    if (initial.state !== 'queued') { done(initial); }
  });
}

test('persistence declarations and JSON commits reject undeclared, ambiguous, reserved, and non-JSON inputs', () => {
  assert.deepEqual(declaredData(dataHtml), [{ provider: 'APP', keys: ['records'] }]);
  for (let html of [
    '<context-provider persist="records"><script type="application/json">{"records":[]}</script></context-provider>',
    dataHtml.replace('persist="records"', 'persist="missing"'), dataHtml.replace('ctx="APP"', 'ctx="AGUI_DATA"'),
    dataHtml + dataHtml, '<context-provider ctx="AGUI_FEEDBACK"></context-provider>',
    '<context-provider ctx="AGUI_SESSION"></context-provider>',
    `<template>${dataHtml}</template>`,
    '<div ctx="APP" persist="records"><script type="application/json">{"records":[]}</script></div>',
  ]) { assert.throws(() => analyzeMarkup(html)); }
  let status = { instanceId: randomUUID(), markupRevision: 0, revision: randomUUID(), targets: [] };
  for (let value of [undefined, Infinity, new Date(), () => {}, Symbol('invalid')]) {
    assert.throws(() => validateDataCommit({ ...dataCommit(status), changes: [{ provider: 'APP', values: { records: [value] } }] }));
  }
  let cycle = {}; Reflect.set(cycle, 'self', cycle);
  assert.throws(() => validateDataCommit(dataCommit(status, { records: cycle })), /deeply/);
  assert.throws(() => validateDataCommit(dataCommit(status, { records: 'x'.repeat(DATA_LIMITS.bytes) })), /limits/);
});

test('commits escape JSON safely, preserve modules/templates/unrelated state, and acknowledge only durable HTML', async (t) => {
  let { runtime } = await setup(t);
  let name = '</script><img src=x onerror="alert(1)"> {{APP/private}}\u2028';
  let input = dataCommit(runtime.data.status(), { records: [{ name }] });
  let result = await commit(runtime, input);
  assert.equal(result.state, 'committed');
  assert.notEqual(result.revision, input.baseRevision);
  let saved = await readRuntimeCache('data-fixture');
  assert.ok(saved);
  assert.equal(saved.revision, result.revision);
  assert.equal(saved.html, runtime.latest?.html);
  assert.match(saved.html, /\\u003c\/script>/);
  assert.match(saved.html, /"theme":"system"/);
  assert.match(saved.html, /<template id="row"><p>{{name}}<\/p><\/template>/);
  assert.match(saved.html, /export default \(\) => {};/);
  assert.doesNotMatch(saved.html, /<img/);
  assert.deepEqual(JSON.parse(saved.html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/)?.[1] || '').records, [{ name }]);
  assert.equal(await readCachedMarkup('data-fixture'), dataHtml, 'Authored definitions never receive submitted data.');
  assert.deepEqual(runtime.data.submit(input), result, 'Identical commits reuse receipts.');
  assert.equal(runtime.data.submit({ ...input, changes: [{ provider: 'APP', values: { records: [] } }] }).failure?.code, 'INVALID_DATA');
  let { commitId, instanceId, markupRevision } = input;
  assert.deepEqual(runtime.data.read({ commitId, instanceId, markupRevision }), result);
});

test('stale data, markup, worker instances, and undeclared fields cannot overwrite saved values', async (t) => {
  let { runtime } = await setup(t);
  let initial = dataCommit(runtime.data.status());
  await commit(runtime, initial);
  let before = await readRuntimeCache('data-fixture');
  assert.equal((await commit(runtime, { ...initial, commitId: randomUUID() })).failure?.code, 'STALE_DATA');
  assert.equal((await commit(runtime, { ...dataCommit(runtime.data.status()), markupRevision: 99 })).failure?.code, 'STALE_MARKUP');
  assert.equal((await commit(runtime, { ...dataCommit(runtime.data.status()), instanceId: randomUUID() })).failure?.code, 'STALE_INSTANCE');
  assert.equal((await commit(runtime, dataCommit(runtime.data.status(), { theme: 'dark' }))).failure?.code, 'INVALID_TARGET');
  assert.deepEqual(await readRuntimeCache('data-fixture'), before);
  assert.equal(runtime.data.read({ commitId: randomUUID(), instanceId: randomUUID(), markupRevision: 0 }).state, 'unknown');
});

test('failed publications and conflicting cache/source edits retain the last saved snapshot', async (t) => {
  let { runtime } = await setup(t);
  await commit(runtime, dataCommit(runtime.data.status()));
  let saved = await readRuntimeCache('data-fixture');
  assert.ok(saved);
  let pending = await prepareRuntimeCache('data-fixture', patchData(dataHtml, [{ provider: 'APP', values: { records: [] } }]), dataHtml, randomUUID(), saved.raw);
  let directory = dirname(runtimeCachePath('data-fixture'));
  let temporary = (await readdir(directory)).find((file) => file.endsWith('.tmp'));
  assert.ok(temporary);
  await unlink(join(directory, temporary));
  await assert.rejects(pending.commit());
  await pending.discard();
  assert.equal((await readRuntimeCache('data-fixture'))?.raw, saved.raw);
  let latest = runtime.latest;
  await writeFile(runtimeCachePath('data-fixture'), saved.raw + '\n');
  assert.equal((await commit(runtime, dataCommit(runtime.data.status(), { records: [] }))).failure?.code, 'CACHE_FAILED');
  assert.equal(runtime.latest, latest);
  assert.match((await readRuntimeCache('data-fixture'))?.html || '', /Example record/);
  await writeFile(runtimeCachePath('data-fixture'), saved.raw);
  await writeFile(cachePath('data-fixture'), dataHtml + '<p>Changed source</p>');
  assert.equal((await commit(runtime, dataCommit(runtime.data.status()))).failure?.code, 'SOURCE_CHANGED');
  assert.equal((await readRuntimeCache('data-fixture'))?.raw, saved.raw);
});

test('private snapshots survive restart and compatible source changes; conflicting sync requires explicit reset', async (t) => {
  let { runtime } = await setup(t);
  await commit(runtime, dataCommit(runtime.data.status()));
  let cached = await readRuntimeCache('data-fixture');
  await runtime.close();
  await writeFile(cachePath('data-fixture'), dataHtml + '<p>New layout</p>');
  let restored = makeRuntime();
  t.after(() => restored.close());
  await restored.start(new AbortController().signal);
  assert.equal(restored.restored, true);
  assert.equal(restored.data.status().revision, cached?.revision);
  assert.match(restored.latest?.html || '', /Example record/);
  assert.match(restored.latest?.html || '', /New layout/);
  await restored.sync();
  assert.match(restored.latest?.html || '', /Example record/);
  await restored.insert(dataHtml + '<p>Replacement</p>');
  assert.match(restored.latest?.html || '', /Example record/);
  assert.doesNotMatch(await readFile(cachePath('data-fixture'), 'utf8'), /Example record/);
  await writeFile(cachePath('data-fixture'), '<p>Incompatible layout</p>');
  await assert.rejects(restored.sync(), { code: 'DATA_CONFLICT' });
  assert.match(restored.latest?.html || '', /Example record/);
  await restored.close();
  let conflicting = makeRuntime();
  t.after(() => conflicting.close());
  await conflicting.start(new AbortController().signal);
  assert.match(conflicting.status().warning || '', /conflicts/);
  assert.match(conflicting.latest?.html || '', /Example record/);
  assert.equal((await commit(conflicting, dataCommit(conflicting.data.status()))).failure?.code, 'SOURCE_CHANGED');
  await conflicting.sync(true);
  assert.equal(conflicting.latest?.html, '<p>Incompatible layout</p>');
  await conflicting.clear();
  assert.equal(await readRuntimeCache('data-fixture'), undefined);
});

test('submitted values stay outside team libraries and near-limit private HTML remains writable', async (t) => {
  let state = await temporaryState();
  process.env.AGUI_LIBRARY_DIR = join(state.directory, 'team');
  await mkdir(process.env.AGUI_LIBRARY_DIR);
  let runtime = makeRuntime();
  t.after(async () => { await runtime.close(); await state.close(); });
  let savedSize = Buffer.byteLength(patchData(dataHtml, [{ provider: 'APP', values: { records: [{ name: 'Example record' }] } }]));
  let html = dataHtml + '<p>' + 'x'.repeat(DATA_LIMITS.bytes - savedSize - 17) + '</p>';
  await save(html);
  await runtime.start(new AbortController().signal);
  await commit(runtime, dataCommit(runtime.data.status()));
  assert.ok(Buffer.byteLength((await readRuntimeCache('data-fixture'))?.raw || '') > DATA_LIMITS.bytes);
  assert.equal((await commit(runtime, dataCommit(runtime.data.status(), { records: [] }))).state, 'committed');
  assert.equal(await readFile(cachePath('data-fixture'), 'utf8'), html);
  assert.deepEqual((await readdir(process.env.AGUI_LIBRARY_DIR)).sort(), ['data-fixture.html', 'data-fixture.md']);
});

test('queue and receipt history stay bounded and shutdown rejects queued commits', async (t) => {
  let { runtime } = await setup(t);
  let release = () => {};
  let gate = runtime.enqueue(() => new Promise((resolve) => { release = () => resolve(undefined); }));
  await new Promise((resolve) => setImmediate(resolve));
  let inputs = Array.from({ length: DATA_LIMITS.pending }, () => dataCommit(runtime.data.status()));
  for (let input of inputs) { assert.equal(runtime.data.submit(input).state, 'queued'); }
  assert.equal(runtime.data.submit(dataCommit(runtime.data.status())).failure?.code, 'QUEUE_FULL');
  runtime.closing = true;
  release();
  await gate;
  await runtime.updates;
  assert.equal(runtime.data.read({ commitId: inputs[0].commitId, instanceId: inputs[0].instanceId, markupRevision: inputs[0].markupRevision }).failure?.code, 'SESSION_STOPPED');
  runtime.closing = false;
  let first;
  for (let index = 0; index < DATA_LIMITS.receipts + 1; index += 1) {
    let input = { ...dataCommit(runtime.data.status()), baseRevision: randomUUID() };
    first ??= input;
    await commit(runtime, input);
  }
  assert.equal(runtime.data.receipts.size, DATA_LIMITS.receipts);
  assert.ok(first);
  assert.equal(runtime.data.read({ commitId: first.commitId, instanceId: first.instanceId, markupRevision: first.markupRevision }).state, 'unknown');
});
