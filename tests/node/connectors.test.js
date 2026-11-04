import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { connectorFixture } from './connector-fixture.js';
import { cli } from '../browser/helpers.js';
import { definitionPaths } from '../../src/library/paths.js';
import { renameSession } from '../../src/sessions/rename.js';
import { readSession } from '../../src/sessions/store.js';
import { requestSession } from '../../src/sessions/client.js';
import { parseCommand } from '../../src/cli/parse.js';
import { validateConnectorPolicy } from '../../src/connectors/validate.js';
import { core } from '../../src/connectors/core.js';

test('connector CLI attaches portable requirements and invokes pinned scripts with durable receipts', {
  timeout: 45000,
}, async (t) => {
  let f = await connectorFixture(t);
  f.cleanup(() => cli('stop', 'backend').catch(() => {}));
  await f.attach();
  let stopped = await cli('connector', 'status', 'backend');
  assert.equal(stopped.state, 'stopped');
  assert.equal(stopped.connectors.available, false);
  let raw = await readFile(definitionPaths('backend').connectorPath, 'utf8');
  assert.ok(!raw.includes(f.collection));
  assert.ok(!raw.includes('grant'));
  let session = await cli('start', 'backend', '--no-open');
  let inputPath = join(f.directory, 'call.json');
  let requestId = randomUUID();
  let payload = {
    requestId,
    input: {
      value: 'saved',
    },
  };
  await writeFile(inputPath, JSON.stringify(payload));
  let args = [
    'connector',
    'call',
    'backend',
    'save',
    '--file',
    inputPath,
  ];
  await assert.rejects(cli(...args), (error) => {
    let result = JSON.parse(/** @type {Error & { stdout: string }} */ (error).stdout);
    assert.equal(result.connectorResult.code, 'ACCESS_DENIED');
    return true;
  });
  await f.grant('backend', 'agent');
  let result = await cli(...args);
  assert.equal(result.connectorResult.state, 'completed');
  assert.deepEqual(result.connectorResult.value, {
    value: 'saved',
    requestId,
  });
  assert.deepEqual((await cli(...args)).connectorResult, result.connectorResult);
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 1);
  await cli('stop', 'backend');
  let restarted = await cli('start', 'backend', '--no-open');
  assert.notEqual(restarted.instanceId, session.instanceId);
  let recovered = await cli('connector', 'receipt', 'backend', 'save', '--request', requestId);
  assert.equal(recovered.connectorResult.state, 'completed');
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 1);
  await writeFile(inputPath, JSON.stringify({
    ...payload,
    instanceId: session.instanceId,
  }));
  await assert.rejects(cli(...args));
  let record = await readSession('backend');
  assert.ok(record);
  let denied = await fetch(`${record.controlUrl}/connector/control`, {
    method: 'POST',
    body: '{}',
  });
  assert.equal(denied.status, 401);
});

test('update, detach, rename, and clear cannot inherit or revive old execution authority', {
  timeout: 45000,
}, async (t) => {
  let f = await connectorFixture(t);
  f.cleanup(() => cli('stop', 'renamed').catch(() => {}));
  await f.attach();
  await f.grant('backend', 'agent');
  let renamed = await renameSession('backend', 'renamed');
  assert.equal(renamed.ok, true);
  assert.equal((await readFile(definitionPaths('renamed').connectorPath, 'utf8')).includes(f.prepared.revision), true);
  await cli('start', 'renamed', '--no-open');
  let file = join(f.directory, 'renamed-call.json');
  await writeFile(file, JSON.stringify({
    requestId: randomUUID(),
    input: {
      value: 'must need grant',
    },
  }));
  await assert.rejects(cli('connector', 'call', 'renamed', 'save', '--file', file));
  await f.grant('renamed', 'agent');
  await writeFile(join(f.sourceDirectory, 'description.md'), '# Revised fixture\n');
  let prepared = (await f.registry.prepare('example.records.save')).result;
  await f.registry.bind('example.records.save', prepared.scriptId, prepared.revision);
  await cli('connector', 'update', 'renamed', 'save');
  await assert.rejects(cli('connector', 'call', 'renamed', 'save', '--file', file));
  await cli('connector', 'detach', 'renamed', 'save');
  assert.equal((await cli('connector', 'list', 'renamed')).connectors.actions.length, 0);
  await cli('clear', 'renamed');
  await assert.rejects(readFile(definitionPaths('renamed').connectorPath), {
    code: 'ENOENT',
  });
});

test('stopping a worker during an accepted write preserves an uncertain non-replayed request', {
  timeout: 45000,
}, async (t) => {
  let f = await connectorFixture(t);
  f.cleanup(() => cli('stop', 'backend').catch(() => {}));
  await f.attach();
  await f.grant('backend', 'agent');
  let started = await cli('start', 'backend', '--no-open');
  let record = await readSession('backend');
  assert.ok(record);
  let requestId = randomUUID();
  let pending = requestSession(record, 'connector/call', 30000, JSON.stringify({
    action: 'save',
    requestId,
    instanceId: started.instanceId,
    markupRevision: 0,
    revision: f.prepared.revision,
    input: {
      value: 'pending',
      delay: 8000,
    },
  }));
  void pending.catch(() => {});
  for (let attempt = 0; attempt < 50; attempt++) {
    if ((await core.listReceipts(f.coreRoot)).some((entry) => entry.requestId === requestId)) { break; }
    await delay(20);
  }
  await cli('stop', 'backend');
  let outcome = await pending;
  assert.ok(outcome.connectorResult);
  assert.notEqual(outcome.connectorResult.state, 'completed');
  await cli('start', 'backend', '--no-open');
  let receipt = await cli('connector', 'receipt', 'backend', 'save', '--request', requestId);
  assert.equal(receipt.connectorResult.state, 'unknown');
  await assert.rejects(readFile(f.log), {
    code: 'ENOENT',
  });
});

test('connector policy and CLI reject execution paths, forged sources, and unsupported fields', () => {
  assert.throws(() => validateConnectorPolicy({
    version: 1,
    actions: [],
    executable: '/bin/sh',
  }));
  assert.throws(() => parseCommand([
    'connector',
    'call',
    'backend',
    'save',
    '--source',
    'agui',
  ]));
  assert.throws(() => parseCommand([
    'connector',
    'attach',
    '../outside',
    'save',
    '--registry',
    '/private/example',
    '--script',
    'example.records.save',
  ]));
});

test('AGUI invokes a pinned SQLite-backed registry through the existing CLI and fails closed when it goes offline', async (t) => {
  let f = await connectorFixture(t);
  f.cleanup(() => cli('stop', 'backend').catch(() => {}));
  let database = join(f.directory, 'registry.sqlite');
  await core.configureStorage(f.collection, {
    type: 'sqlite',
    database,
  }, (await f.registry.read()).document.generation, f.coreRoot);
  await f.attach();
  await f.grant('backend', 'agent');
  await cli('start', 'backend', '--no-open');
  let input = join(f.directory, 'sqlite-call.json');
  await writeFile(input, JSON.stringify({
    requestId: randomUUID(),
    input: {
      value: 'database-backed',
    },
  }));
  let result = await cli('connector', 'call', 'backend', 'save', '--file', input);
  assert.equal(result.connectorResult.state, 'completed');
  assert.equal(result.connectorResult.value.value, 'database-backed');
  let {
    rename,
  } = await import('node:fs/promises');
  await rename(database, `${database}.offline`);
  await writeFile(input, JSON.stringify({
    requestId: randomUUID(),
    input: {
      value: 'must not use a stale binding',
    },
  }));
  await assert.rejects(cli('connector', 'call', 'backend', 'save', '--file', input));
  assert.equal((await readFile(f.log, 'utf8')).trim().split('\n').length, 1);
});
