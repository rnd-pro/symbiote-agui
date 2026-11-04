export type CoreRegistry = import('agent-connectors').FileRegistry;
export type CoreManifest = Awaited<ReturnType<CoreRegistry['show']>>['manifest'];
export type CoreGrant = Awaited<ReturnType<typeof import('agent-connectors').grantCapability>>;

export interface ConnectorRequirement {
  name: string;
  registryId: string;
  address: string;
  scriptId: string;
  revision: string;
  effect: CoreManifest['effect'];
}

export interface ConnectorPolicy {
  version: 1;
  actions: ConnectorRequirement[];
}

export interface ConnectorPrivate {
  version: 1;
  epoch: string;
  routes: Record<string, string>;
  accepted: Record<string, string>;
}

export interface ConnectorReference {
  action: string;
  requestId: string;
  instanceId: string;
}

export interface ConnectorCall extends ConnectorReference {
  revision: string;
  markupRevision: number;
  input: unknown;
}

export interface ConnectorResult extends ConnectorReference {
  revision?: string;
  state: 'running' | 'completed' | 'rejected' | 'unknown';
  code?: string;
  value?: unknown;
}

export interface ConnectorStatus {
  version: 1;
  contractVersion: number;
  instanceId?: string;
  markupRevision: number;
  available: boolean;
  localOnly: true;
  pending: number;
  actions: ConnectorRequirement[];
}

export interface ConnectorInspection extends ConnectorStatus {
  inspection: Array<{
    name: string;
    resolved: boolean;
    prepared: boolean;
    configuredSources: string[];
    code?: string;
  }>;
}

export interface ConnectorReview {
  requirement: ConnectorRequirement;
  description: string;
  manifest?: CoreManifest;
  files?: Awaited<ReturnType<CoreRegistry['show']>>['files'];
  prepared?: boolean;
  source?: string;
}

export interface ManagerConnectorSettings {
  sessionId: string;
  instanceId: string | null;
  status: ConnectorInspection;
  review?: ConnectorReview;
}

export type ConnectorChange =
  | { command: 'attach'; action: string; registry: string; address: string; cwd: string }
  | { command: 'update'; action: string; registry?: string; cwd?: string }
  | { command: 'review'; action: string; path?: string }
  | { command: 'detach' | 'describe'; action: string }
  | { command: 'list' | 'status' }
  | { command: 'grant'; action: string; revision: string; source: 'agent' | 'agui'; profile?: string; timeoutMs?: number; resultBytes?: number }
  | { command: 'revoke'; action: string };

export interface ConnectorCliRequest {
  kind: 'connector';
  command: ConnectorChange['command'] | 'call' | 'receipt';
  sessionId: string;
  action?: string;
  values: Record<string, string>;
}

export type ConnectorPageMessage =
  | { type: 'connector-call'; call: ConnectorCall }
  | { type: 'connector-read'; reference: ConnectorReference };

export type ConnectorServerMessage =
  | { type: 'connector-status'; connectors: ConnectorStatus }
  | { type: 'connector-result'; result: ConnectorResult };
