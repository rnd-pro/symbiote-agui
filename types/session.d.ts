import type { SESSION_STATE } from '../src/sessions/constants.js';

export type SessionState = typeof SESSION_STATE[keyof typeof SESSION_STATE];

export interface SessionStatus {
  sessionId: string;
  state: SessionState;
  url?: string;
  cdpUrl?: string;
}
