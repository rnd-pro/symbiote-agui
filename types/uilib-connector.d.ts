import type { ConnectorResult } from './connectors.js';

export interface UiConnectorResult extends ConnectorResult {
  inputRevision: number;
  stale: boolean;
}

export interface UiConnectorState {
  action: string;
  input: unknown;
  value?: unknown;
  disabled?: boolean;
  readonly?: boolean;
  pending: boolean;
  unavailable: boolean;
  receiptUnavailable: boolean;
  outcome: ConnectorResult['state'] | 'idle';
  error: string;
  requestId: string;
  result: UiConnectorResult | null;
  stale: boolean;
}
