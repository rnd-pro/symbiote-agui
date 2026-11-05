export type AssetCliRequest =
  | { kind: 'assets'; command: 'add'; sessionId: string; file: string; path?: string; replace: boolean }
  | { kind: 'assets'; command: 'list'; sessionId: string; offset: number; limit: number }
  | { kind: 'assets'; command: 'remove'; sessionId: string; path: string };

export interface AssetEntry {
  path: string;
  size: number;
  contentType: string;
  url: string;
}

export interface AssetRoot {
  path: string;
  dev: number;
  ino: number;
}

export interface AssetInventory {
  root?: AssetRoot;
  entries: AssetEntry[];
  directories: string[];
  totalBytes: number;
}

export type AssetResult =
  | { sessionId: string; command: 'assets list'; total: number; totalBytes: number; offset: number; limit: number; assets: AssetEntry[] }
  | { sessionId: string; command: 'assets add'; replaced: boolean; asset: AssetEntry }
  | { sessionId: string; command: 'assets remove'; removed: string };
