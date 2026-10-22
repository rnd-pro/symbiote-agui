import type { DATA_ENDPOINT_KIND } from '../src/metadata/constants.js';

export interface DataEndpoint {
  kind: typeof DATA_ENDPOINT_KIND[keyof typeof DATA_ENDPOINT_KIND];
  description: string;
  /** Non-secret resource name, file label, or URL; never connection credentials. */
  reference?: string;
}

export interface DataBinding {
  provider: string;
  keys: string[];
}

export interface DataFlow {
  description: string;
  initialSource: DataEndpoint;
  bindings: DataBinding[];
  targets: DataEndpoint[];
}

export interface SessionMetadata {
  dataFlow?: DataFlow;
}

export interface SessionMetadataResult {
  sessionId: string;
  metadata: SessionMetadata;
}
