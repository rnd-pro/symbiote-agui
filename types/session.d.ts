import type { SESSION_STATE } from '../src/sessions/constants.js';
import type { CommandFailure } from './cli.js';

export type SessionState = typeof SESSION_STATE[keyof typeof SESSION_STATE];

export interface SessionStatus {
  sessionId: string;
  instanceId?: string;
  pageConnections?: import('./connections.js').WorkerConnections;
  state: SessionState;
  active?: boolean;
  pid?: number;
  url?: string;
  publicUrl?: string;
  publicUserUrl?: string;
  publicViewerUrl?: string;
  tunnel?: TunnelStatus;
  clients?: number;
  delivery?: string;
  opened?: boolean;
  warning?: string;
  restored?: boolean;
  synced?: boolean;
  cleared?: boolean;
  events?: import('./transport.js').SessionEvent[];
  dropped?: number;
  toolResponse?: import('./tools.js').ToolResponse;
  feedback?: import('./feedback.js').FeedbackStatus;
  /** Only returned by the authenticated feedback check operation. */
  feedbackCheck?: import('./feedback.js').FeedbackCheck;
  /** Only returned by the authenticated feedback settings operation. */
  feedbackSettings?: import('./feedback.js').FeedbackSettings;
  data?: import('./data.js').DataStatus;
  transferSnapshot?: import('./transfer.js').TransferSnapshot;
}

export type SessionFeedbackStatus = SessionStatus & {
  feedback: import('./feedback.js').FeedbackStatus;
};

export interface TunnelStatus {
  state: 'starting' | 'ready' | 'failed' | 'stopped';
  active?: boolean | null;
  checkedAt?: string;
  checkError?: string;
  error?: string;
}

export type SessionOperationResult = ({ ok: true } & SessionStatus)
  | (CommandFailure & Omit<Partial<SessionStatus>, 'active'> & { sessionId: string; active?: boolean | null });

export type SessionRenameResult = SessionOperationResult & {
  previousSessionId: string;
  renamed: boolean;
  transfer?: import('./transfer.js').TransferResult;
};

export type AllSessionsResult = {
  command: import('./cli.js').AllSessionsCommand;
  total: number;
  sessions: SessionOperationResult[];
} & ({ ok: true } | CommandFailure);

export interface SessionRecord {
  sessionId: string;
  instanceId: string;
  controlToken: string;
  pid: number;
  launcherPid: number;
  controlUrl?: string;
  url?: string;
}

export type WorkerReply =
  | { kind: 'ready'; result: SessionStatus }
  | { kind: 'failed'; message: string };

export interface ControlIdentity {
  instanceId: string;
  pid: number;
}

export type ControlReply = ControlIdentity & (
  | { result: SessionStatus }
  | { error: CommandFailure['error']; exitCode: number }
);

export interface ControlActions {
  connections?(): SessionStatus;
  disconnectPage?(input: unknown): Promise<SessionStatus>;
  tunnelStop?(): Promise<SessionStatus>;
  insert?(html: string): Promise<SessionStatus>;
  update?(input: unknown): Promise<SessionStatus>;
  events?(): SessionStatus;
  tools?(input: unknown): Promise<SessionStatus>;
  clear?(): Promise<SessionStatus>;
  sync?(resetData?: boolean): Promise<SessionStatus>;
  share?(): Promise<SessionStatus>;
  tunnelRenew?(): Promise<SessionStatus>;
  transferSnapshot?(): Promise<SessionStatus>;
  feedbackConfigure?(input: unknown): Promise<SessionFeedbackStatus>;
  feedbackStatus?(): SessionFeedbackStatus;
  feedbackSettings?(): import('./feedback.js').FeedbackSettings;
  feedbackCheck?(input: unknown): SessionFeedbackStatus;
  feedbackDisable?(input: unknown): Promise<SessionFeedbackStatus>;
}

export interface PreparedCache {
  commit(): Promise<void>;
  discard(): Promise<void>;
}

export interface PendingPageRequest {
  socket: import('ws').WebSocket;
  resolve(result?: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

export interface PageAccess {
  path: string;
  socketPath: string;
  publicOrigin?: string;
  sharing?: boolean;
}
