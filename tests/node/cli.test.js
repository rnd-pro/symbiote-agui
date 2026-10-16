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
  for (let command of ['stop-all', 'clear-all']) {
    assert.deepEqual(parseCommand([command]), { kind: 'all', command });
    for (let args of [
      [command, 'desk'],
      [command, '--file', 'input.json'],
      [command, '--no-open'],
      [command, '--authorize'],
      [command, '--page', 'tab'],
    ]) {
      assert.throws(() => parseCommand(args), { code: 'INVALID_INPUT' });
    }
  }
});
