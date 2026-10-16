import { requestTools } from '../tools/client.js';

/**
 * @param {keyof typeof import('./catalog.js').MCP_TOOLS} name
 * @param {import('../../types/tools.js').McpToolArguments} args
 */
export async function forwardToolRequest(name, args) {
  let operations = { list_pages: 'pages', list_tools: 'tools', call_tool: 'call' };
  let request = {
    action: operations[name], pageId: args.pageId, discoveryId: args.discoveryId, name: args.name, input: args.input,
  };
  return requestTools(args.sessionId, request);
}
