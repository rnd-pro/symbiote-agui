import type { StorageSettings, DefinitionInfo } from './library.js';
import type { SessionOperationResult, TunnelStatus } from './session.js';
import type { CommandFailure } from './cli.js';
import type { ConnectedProject, ProjectListing } from './projects.js';
import type { ProjectDirectory, ProjectPreview } from './explorer.js';

export type ManagerTheme = 'system' | 'light' | 'dark';

export type ManagerOperation = keyof typeof import('../src/manager/constants.js').MANAGER_OPERATIONS;

export interface ManagerRequest {
  id: string;
  operation: ManagerOperation;
  sessionId?: string;
  all?: boolean;
  confirm?: boolean;
  folder?: string | null;
  projectId?: string;
  path?: string;
  offset?: number;
  showHidden?: boolean;
  destinationProjectId?: string;
  destinationSessionId?: string;
  includeData?: boolean;
  includeMetadata?: boolean;
  transferId?: string;
  instanceId?: string;
  conversationId?: string;
  command?: import('./feedback.js').FeedbackCommand;
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
  projects: ProjectListing;
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
  cancelled?: boolean;
  sessions?: SessionOperationResult[];
  description?: DefinitionInfo;
  snapshot?: ManagerSnapshot;
  manager?: ManagerStatus;
  project?: ConnectedProject;
  projects?: ProjectListing;
  folderPath?: string;
  directory?: ProjectDirectory;
  preview?: ProjectPreview;
  transfer?: import('./transfer.js').TransferResult;
  transfers?: import('./transfer.js').TransferResult[];
  feedbackSettings?: import('./feedback.js').FeedbackSettings;
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
