let sessionId = { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$', description: 'The named AGUI session used with the CLI.' };
let pageId = { type: 'string', minLength: 1, description: 'Connection ID returned by list_pages or list_tools.' };

export let MCP_TOOLS = Object.freeze({
  list_pages: {
    description: 'List connected pages for an AGUI session. Use their page IDs to select one tab.',
    inputSchema: { type: 'object', properties: { sessionId }, required: ['sessionId'], additionalProperties: false },
  },
  list_tools: {
    description: 'Discover current Symbiote tools and input schemas on one AGUI page. If pageId is omitted, exactly one page must be connected. Reuse the returned pageId and discoveryId for calls.',
    inputSchema: { type: 'object', properties: { sessionId, pageId }, required: ['sessionId'], additionalProperties: false },
  },
  call_tool: {
    description: 'Invoke one discovered Symbiote tool on one page. Validate input against its discovered schema. Rediscover after catalog changes. A timeout or disconnection may leave the outcome unknown; do not retry automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId,
        pageId,
        discoveryId: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, description: 'The exact discovered Symbiote tool name.' },
        input: { type: 'object', description: 'Arguments matching the discovered inputSchema.' },
      },
      required: ['sessionId', 'pageId', 'discoveryId', 'name', 'input'],
      additionalProperties: false,
    },
  },
});
