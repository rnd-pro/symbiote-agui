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
  dataFlow?: import('./metadata.js').DataFlow;
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

export interface DataTransferDocument {
  version: 1;
  changes: DataChange[];
}

export interface DataTransferState {
  operation: 'import' | 'export';
  state: 'picking' | 'reading' | 'exporting' | 'imported' | 'download-started' | 'cancelled' | 'error';
  message: string;
  fileName?: string;
  targets?: DataTarget[];
  endpoint?: import('./metadata.js').DataEndpoint;
  failure?: { code: keyof typeof import('../src/page/client/uilib/controls/data-toolbar/constants.js').TRANSFER_FAILURES; message: string };
}

export interface DataTransferOptions {
  input: HTMLInputElement;
  texts?: import('./uilib.js').UiTexts;
  targets(): DataTarget[];
  report(state: DataTransferState): void;
  exportTarget?: import('./metadata.js').DataEndpoint;
}
