import type { StorageSettings, DefinitionInfo } from './library.js';
import type { SessionOperationResult, TunnelStatus } from './session.js';
import type { CommandFailure } from './cli.js';

export type ManagerTheme = 'system' | 'light' | 'dark';

export type ManagerOperation = 'snapshot' | 'describe' | 'start' | 'stop' | 'clear' | 'sync' | 'share' | 'tunnel check' | 'tunnel renew' | 'configure storage';

export interface ManagerRequest {
  id: string;
  operation: ManagerOperation;
  sessionId?: string;
  all?: boolean;
  confirm?: boolean;
  folder?: string | null;
}

export interface ManagerScope {
  stateRoot: string;
  settings: StorageSettings;
}

export type ManagerSession = SessionOperationResult & {
  definition?: DefinitionInfo;
  definitionError?: string;
};

export interface ManagerSnapshot {
  scope: ManagerScope;
  checkedAt: string;
  sessions: ManagerSession[];
  storage: ManagerStorageSettings;
}

export interface ManagerStorageSettings {
  editable: boolean;
  folder?: string;
  defaultFolder: string;
  projectDirectory?: string;
  configPath?: string;
  message: string;
}

export interface ManagerResult {
  ok: boolean;
  sessions?: SessionOperationResult[];
  description?: DefinitionInfo;
  snapshot?: ManagerSnapshot;
  manager?: ManagerStatus;
  error?: CommandFailure['error'];
}

export type ManagerReply = { id: string; result: ManagerResult };

export interface ManagerRecord extends ManagerScope {
  projectDirectory?: string;
  instanceId: string;
  token: string;
  pid: number;
  url?: string;
}

export interface ManagerStatus extends ManagerScope {
  active: boolean;
  pid?: number;
  url?: string;
  launchUrl?: string;
  opened?: boolean;
  warning?: string;
}

export interface TunnelCheck {
  publicUrl?: string;
  tunnel: TunnelStatus;
}
