import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

export async function connectMcp() {
  let transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../../bin/symbiote-agui.js', import.meta.url)), 'mcp'],
    env: /** @type {Record<string, string>} */ (process.env),
    stderr: 'pipe',
  });
  let client = new Client({ name: 'agui-regression', version: '1.0.0' });
  await client.connect(transport);
  return client;
}

/**
 * @param {Client} client
 * @param {'list_pages' | 'list_tools' | 'call_tool'} name
 * @param {Record<string, unknown>} args
 */
export async function mcpCall(client, name, args) {
  let result = await client.callTool({ name, arguments: args });
  if (!('content' in result) || !Array.isArray(result.content)) { throw new Error('Missing MCP tool result.'); }
  let text = result.content.find((item) => item.type === 'text');
  if (!text || !('text' in text) || typeof text.text !== 'string') { throw new Error('Missing MCP text result.'); }
  let data;
  try { data = JSON.parse(text.text); }
  catch { data = text.text; }
  return { isError: result.isError === true, data };
}
