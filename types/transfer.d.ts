import type { ConnectedProject } from './projects.js';

export type TransferKind = 'copy' | 'move';
export type TransferFileKey = typeof import('../src/projects/transfer/constants.js').TRANSFER_FILE_KEYS[number];
export type TransferFiles = Record<TransferFileKey, string | null>;
export interface TransferScope extends ConnectedProject {
  stateRoot: string;
}
export interface TransferSnapshot {
  files: TransferFiles;
}
export interface TransferInput {
  kind: TransferKind;
  sessionId: string;
  destinationProjectId: string;
  destinationSessionId: string;
  includeData: boolean;
  includeMetadata: boolean;
}
export interface TransferReceipt extends TransferInput {
  version: 1;
  id: string;
  source: TransferScope;
  destination: TransferScope;
  state: 'preparing' | 'publishing' | 'cleaning-source' | 'complete' | 'needs-recovery' | 'rolled-back';
  createdAt: string;
  error?: string;
  sourceHashes: TransferFiles;
  destinationHashes: TransferFiles;
}
export interface TransferResult extends TransferReceipt {
  receiptPath: string;
  backupPath: string;
  recoveryRequired: boolean;
}
