import assert from 'node:assert/strict';
import test from 'node:test';
import { connectMcp, mcpCall } from './mcp-client.js';
import { temporaryState } from './state-fixture.js';
import { parseCommand } from '../../src/cli/parse.js';
import { validateToolInput } from '../../src/tools/validation.js';

test('MCP uses real stdio negotiation, exposes schemas, and reports invalid or absent sessions', async (t) => {
  let state = await temporaryState();
  t.after(() => state.close());
  let client = await connectMcp();
  t.after(() => client.close());
  let tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), ['call_tool', 'list_pages', 'list_tools']);
  assert.deepEqual(parseCommand(['mcp']), { kind: 'mcp' });
  assert.throws(() => parseCommand(['mcp', 'session']));
  assert.throws(() => parseCommand(['mcp', '--no-open']));
  let absent = await mcpCall(client, 'list_pages', { sessionId: 'absent' });
  assert.equal(absent.isError, true);
  assert.equal(absent.data.error.code, 'SESSION_STOPPED');
  assert.equal((await mcpCall(client, 'list_pages', { sessionId: '../escape' })).isError, true);
  assert.equal((await mcpCall(client, 'call_tool', { sessionId: 'absent', name: 'missing' })).isError, true);
  await client.ping();
});

test('tool schemas validate constraints and references without coercing input', () => {
  let schema = {
    type: 'object',
    properties: { count: { $ref: '#/$defs/count' } },
    $defs: { count: { type: 'integer', minimum: 1, maximum: 3 } },
    required: ['count'],
    additionalProperties: false,
  };
  validateToolInput(schema, { count: 2 });
  for (let input of [{}, { count: '2' }, { count: 0 }, { count: 4 }, { count: 2, other: 1 }]) {
    assert.throws(() => validateToolInput(schema, input), /schema/);
  }
  assert.throws(() => validateToolInput({ type: 'nonexistent-type' }, {}), /cannot be validated/);
});
