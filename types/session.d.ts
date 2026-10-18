import type { SESSION_STATE } from '../src/sessions/constants.js';
import type { CommandFailure } from './cli.js';

export type SessionState = typeof SESSION_STATE[keyof typeof SESSION_STATE];

export interface SessionStatus {
  sessionId: string;
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
  cleared?: boolean;
  events?: import('./transport.js').SessionEvent[];
  dropped?: number;
  toolResponse?: import('./tools.js').ToolResponse;
}

export interface TunnelStatus {
  state: 'starting' | 'ready' | 'failed' | 'stopped';
  error?: string;
}

export type SessionOperationResult = ({ ok: true } & SessionStatus)
  | (CommandFailure & { sessionId: string; active?: null });

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
  insert?(html: string): Promise<SessionStatus>;
  update?(input: unknown): Promise<SessionStatus>;
  events?(): SessionStatus;
  tools?(input: unknown): Promise<SessionStatus>;
  clear?(): Promise<SessionStatus>;
  share?(): Promise<SessionStatus>;
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
