import type { ConnectedProject } from './projects.js';
import type { ConnectedPage } from './tools.js';
import type { TunnelStatus, SessionState } from './session.js';

export interface WorkerConnections {
  project: ConnectedProject;
  pages: ConnectedPage[];
}

export interface LiveSessionConnections {
  project: ConnectedProject;
  sessionId: string;
  instanceId: string;
  pid: number;
  state?: SessionState;
  url?: string;
  publicUrl?: string;
  tunnel?: TunnelStatus;
  pages: ConnectedPage[];
  manageable: boolean;
  error?: string;
}

export interface GlobalConnections {
  checkedAt: string;
  sessions: LiveSessionConnections[];
  errors: string[];
}
