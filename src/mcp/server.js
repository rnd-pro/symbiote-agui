import { readFile } from 'node:fs/promises';
import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { MCP_TOOLS } from './catalog.js';
import { forwardToolRequest } from './bridge.js';
import { CommandError } from '../shared/command-error.js';

export async function startMcpServer() {
  let metadata = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  let server = new McpServer({ name: metadata.name, version: metadata.version });
  for (let [name, tool] of Object.entries(MCP_TOOLS)) {
    let key = /** @type {keyof typeof MCP_TOOLS} */ (name);
    server.registerTool(name, {
      description: tool.description,
      inputSchema: fromJsonSchema(/** @type {import('@modelcontextprotocol/server').JsonSchemaType} */ (tool.inputSchema)),
      annotations: { readOnlyHint: name !== 'call_tool', openWorldHint: name === 'call_tool' },
    }, async (input) => {
      try {
        let response = await forwardToolRequest(key, /** @type {import('../../types/tools.js').McpToolArguments} */ (input));
        let result = response.action === 'call' ? response.result : undefined;
        let isError = !!result && typeof result === 'object' && 'isError' in result && result.isError === true;
        return { content: [{ type: 'text', text: JSON.stringify(response) }], structuredContent: response, isError };
      } catch (error) {
        let message = error instanceof Error ? error.message : String(error);
        let code = error instanceof CommandError ? error.code : 'TOOL_FAILED';
        return { content: [{ type: 'text', text: JSON.stringify({ error: { code, message } }) }], isError: true };
      }
    });
  }
  server.server.onerror = (error) => console.error(error.message);
  await server.connect(new StdioServerTransport());
  return server;
}
