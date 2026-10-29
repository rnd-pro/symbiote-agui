export interface StorageSettings {
  mode: 'folder' | 'cache';
  source: 'environment' | 'project' | 'manager';
  folder?: string;
  configPath?: string;
}

export interface DefinitionInfo {
  sessionId: string;
  title: string;
  summary: string;
  htmlPath: string;
  descriptionPath: string;
  proxyPath?: string;
  description?: string;
  metadata?: import('./metadata.js').SessionMetadata;
  dataFlowSummary?: string;
}

export type LibraryResult =
  | { settings: StorageSettings }
  | { total: number; definitions: DefinitionInfo[] }
  | DefinitionInfo;
