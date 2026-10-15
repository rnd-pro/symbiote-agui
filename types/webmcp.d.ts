export interface NativeWebMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface NativeWebMCPContext {
  getTools(): Promise<NativeWebMCPTool[]>;
  executeTool(tool: NativeWebMCPTool, input: Record<string, unknown>): Promise<string>;
}
