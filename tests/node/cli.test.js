import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { parseCommand } from '../../src/cli/parse.js';
import { callTool } from '../../src/cli/tools.js';
import { temporaryState } from './state-fixture.js';

test('CLI tool commands parse explicit page selection and reject unrelated options', () => {
  assert.partialDeepStrictEqual(parseCommand(['pages', 'desk']), { command: 'pages', sessionId: 'desk' });
  assert.partialDeepStrictEqual(parseCommand(['tools', 'desk', '--page', 'tab']), { command: 'tools', pageId: 'tab' });
  assert.partialDeepStrictEqual(parseCommand(['call', 'desk', '--file', 'call.json']), { command: 'call', file: 'call.json' });
  for (let args of [
    ['pages', 'desk', '--file', 'call.json'],
    ['call', 'desk', '--page', 'tab'],
    ['tools', 'desk', '--page', ''],
    ['pages', '../desk'],
    ['tools', 'desk', 'other'],
  ]) {
    assert.throws(() => parseCommand(args));
  }
});

test('CLI calls reject malformed envelopes before contacting a session', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let file = join(state.directory, 'call.json');
  for (let source of ['invalid', 'null', '[]', '{}', '{"pageId":"tab","discoveryId":"catalog","name":"act","input":[]}']) {
    await writeFile(file, source);
    await assert.rejects(callTool('desk', file), { code: 'INVALID_INPUT' });
  }
  await writeFile(file, JSON.stringify({ pageId: 'tab', discoveryId: 'catalog', name: 'act', input: {} }));
  await assert.rejects(callTool('desk', file), { code: 'SESSION_STOPPED' });
});

test('commands for all sessions require no session ID and reject extra arguments or options', () => {
  for (let command of ['status all', 'stop all', 'stop-all', 'clear-all']) {
    let parts = command.split(' ');
    assert.deepEqual(parseCommand(parts), { kind: 'all', command });
    for (let args of [
      [...parts, 'desk'],
      [...parts, '--file', 'input.json'],
      [...parts, '--no-open'],
      [...parts, '--authorize'],
      [...parts, '--page', 'tab'],
    ]) {
      assert.throws(() => parseCommand(args), { code: 'INVALID_INPUT' });
    }
  }
  assert.partialDeepStrictEqual(parseCommand(['status', 'desk']), { kind: 'command', command: 'status', sessionId: 'desk' });
  assert.partialDeepStrictEqual(parseCommand(['stop', 'desk']), { kind: 'command', command: 'stop', sessionId: 'desk' });
});

test('start all opens pages by default and accepts only the no-open option', () => {
  assert.deepEqual(parseCommand(['start', 'all']), { kind: 'all', command: 'start all', open: true });
  assert.deepEqual(parseCommand(['start', 'all', '--no-open']), { kind: 'all', command: 'start all', open: false });
  for (let extra of [['desk'], ['--tunnel'], ['--file', 'input.html'], ['--page', 'tab']]) {
    assert.throws(() => parseCommand(['start', 'all', ...extra]), { code: 'INVALID_INPUT' });
  }
  assert.partialDeepStrictEqual(parseCommand(['start', 'desk']), { kind: 'command', command: 'start', sessionId: 'desk' });
});

test('committed-data reset must explicitly target one sync operation', () => {
  assert.partialDeepStrictEqual(parseCommand(['sync', 'desk', '--reset-data']), { command: 'sync', sessionId: 'desk', resetData: true });
  assert.equal(Reflect.get(parseCommand(['sync', 'desk']), 'resetData'), undefined);
  for (let args of [['sync', 'all', '--reset-data'], ['start', 'desk', '--reset-data'], ['insert', 'desk', '--reset-data']]) {
    assert.throws(() => parseCommand(args), { code: 'INVALID_INPUT' });
  }
});
