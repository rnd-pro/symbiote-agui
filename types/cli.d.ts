import type { COMMANDS, ALL_COMMANDS } from '../src/cli/commands.js';
import type { ERROR_CODE, EXIT_CODE } from '../src/shared/constants.js';
import type { SessionStatus } from './session.js';

export type SessionCommand = keyof typeof COMMANDS;
export type AllSessionsCommand = keyof typeof ALL_COMMANDS;
export type ErrorCode = typeof ERROR_CODE[keyof typeof ERROR_CODE];
export type ExitCode = typeof EXIT_CODE[keyof typeof EXIT_CODE];

export type CliRequest =
  | { kind: 'help' }
  | { kind: 'version' }
  | { kind: 'mcp' }
  | { kind: 'all'; command: AllSessionsCommand }
  | {
    kind: 'command';
    command: SessionCommand;
    sessionId: string;
    open: boolean;
    file?: string;
    pageId?: string;
    tunnel: boolean;
  };

export interface CommandFailure {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

export type CommandResult = ({ ok: true } & (SessionStatus | import('./tools.js').SessionToolResponse))
  | CommandFailure
  | import('./session.js').AllSessionsResult;
