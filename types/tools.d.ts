export type PageTool = import('@symbiotejs/symbiote/webmcp').WebMCPRegistryEntry;

export interface ConnectedPage {
  pageId: string;
  url: string;
  title: string;
  ready: boolean;
  role?: import('./transport.js').PageRole;
}

export type ToolRequest =
  | { action: 'pages' }
  | { action: 'tools'; pageId?: string }
  | { action: 'call'; pageId: string; discoveryId: string; name: string; input: Record<string, unknown> };

export interface ToolDiscovery {
  discoveryId: string;
  tools: PageTool[];
}

export type ToolResponse =
  | { action: 'pages'; pages: ConnectedPage[] }
  | ({ action: 'tools'; pageId: string } & ToolDiscovery)
  | { action: 'call'; pageId: string; result: unknown };

export type SessionToolResponse = { sessionId: string } & ToolResponse;

export interface PagePeer {
  socket: import('ws').WebSocket;
  url?: string;
  title: string;
  ready: boolean;
  error?: string;
  role?: import('./transport.js').PageRole;
  viewerRequested?: boolean;
}

export type McpToolArguments = {
  sessionId: string;
  pageId?: string;
  discoveryId?: string;
  name?: string;
  input?: Record<string, unknown>;
};
