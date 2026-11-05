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

export interface AssetIdentity {
  dev: number;
  ino: number;
}

export interface AssetRoot extends AssetIdentity {
  path: string;
}

export interface AssetManifest {
  directories: string[];
  files: Array<{
    path: string;
    size: number;
    sha256: string;
  }>;
}

export interface AssetInventory {
  root?: AssetRoot;
  entries: AssetEntry[];
  directories: string[];
  totalBytes: number;
}

export interface AssetFile {
  handle: import('node:fs/promises').FileHandle;
  info: import('node:fs').Stats;
}

export interface AssetStatus {
  configured: boolean | null;
  /** Route capability; not a claim that every published file is valid. */
  available: boolean;
  path: string;
  error?: string;
}

export interface AssetHttpDependencies {
  limits?: Partial<Record<keyof typeof import('../src/assets/constants.js').ASSET_LIMITS, number>>;
  open?: (path: string, signal: AbortSignal) => Promise<AssetFile>;
}

export type AssetResult =
  | { sessionId: string; command: 'assets list'; total: number; totalBytes: number; offset: number; limit: number; assets: AssetEntry[] }
  | { sessionId: string; command: 'assets add'; replaced: boolean; asset: AssetEntry }
  | { sessionId: string; command: 'assets remove'; removed: string };
