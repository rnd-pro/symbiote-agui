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

export interface SavedDataSelection extends SavedReference {
  provider: string;
  key: string;
  path?: string[];
  offset?: number;
  limit?: number;
}
