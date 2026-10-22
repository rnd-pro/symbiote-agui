import type { JsonValue } from './json.js';
import type { DATA_FAILURES } from '../src/data/constants.js';

export interface DataTarget {
  provider: string;
  keys: string[];
}

export interface DataChange {
  provider: string;
  values: Record<string, JsonValue>;
}

export interface DataReference {
  commitId: string;
  instanceId: string;
  markupRevision: number;
}

export interface DataCommit extends DataReference {
  baseRevision: string;
  changes: DataChange[];
}

export interface DataResult extends DataReference {
  state: 'queued' | 'committed' | 'rejected' | 'unknown';
  revision?: string;
  failure?: { code: keyof typeof DATA_FAILURES; message: string };
}

export interface DataStatus {
  instanceId: string;
  markupRevision: number;
  revision: string;
  targets: DataTarget[];
}

export interface DataUiState {
  connected: boolean;
  current: DataStatus | null;
  baseRevision: string | null;
  stale: boolean;
  pending: number;
  result: DataResult | null;
}

export interface RuntimeDataCache {
  html: string;
  sourceHash: string;
  revision: string;
  raw: string;
}

export interface DataClientRequest {
  reference: DataReference;
  commit?: DataCommit;
  read: boolean;
  resolve(result: DataResult): void;
  promise: Promise<DataResult>;
  timer: number;
}

export interface DataReceipt {
  fingerprint: string;
  result: DataResult;
}
