import type { DataChange, DataReference, DataResult } from './data.js';
import type { FeedbackDelivery } from './feedback.js';

export interface SavedReference extends DataReference {
  revision: string;
}

export interface ExternalAcknowledgement extends SavedReference {
  state: 'verified' | 'failed' | 'unknown';
  message?: string;
}

export interface ToolbarSubmission {
  reference: DataReference;
  changes: DataChange[];
  result?: DataResult;
  delivery?: FeedbackDelivery;
  external?: ExternalAcknowledgement;
}

export interface ToolbarIndicatorInput {
  viewer: boolean;
  connected: boolean;
  dirty: boolean;
  stale: boolean;
  issue: boolean;
  submission?: ToolbarSubmission;
  transfer?: import('./data.js').DataTransferState;
}

export interface ToolbarNotice {
  message: string;
  tone: import('./uilib.js').UiMessageTone;
}

export interface ToolbarNoticesInput {
  viewer: boolean;
  dirty: boolean;
  stale: boolean;
  issue: string;
  submission?: ToolbarSubmission;
  transfer?: import('./data.js').DataTransferState;
}

export interface SavedDataSelection extends SavedReference {
  provider: string;
  key: string;
  path?: string[];
  offset?: number;
  limit?: number;
}
