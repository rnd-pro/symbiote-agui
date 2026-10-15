import type { SESSION_STATE } from '../src/sessions/constants.js';
import type { BrowserOptions } from './browser.js';
import type { CommandFailure } from './cli.js';

export type SessionState = typeof SESSION_STATE[keyof typeof SESSION_STATE];

export interface SessionStatus {
  sessionId: string;
  state: SessionState;
  url?: string;
  cdpUrl?: string;
}

export interface SessionRecord {
  sessionId: string;
  instanceId: string;
  controlToken: string;
  pid: number;
  launcherPid: number;
  browser: BrowserOptions;
  controlUrl?: string;
  url?: string;
  cdpUrl?: string;
  targetId?: string;
  browserPid?: number;
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
