import type { COMMANDS, ALL_COMMANDS } from '../src/cli/commands.js';
import type { ERROR_CODE, EXIT_CODE } from '../src/shared/constants.js';
import type { SessionStatus } from './session.js';

export type SessionCommand = keyof typeof COMMANDS;
export type AllSessionsCommand = keyof typeof ALL_COMMANDS;
export type ErrorCode = typeof ERROR_CODE[keyof typeof ERROR_CODE];
export type ExitCode = typeof EXIT_CODE[keyof typeof EXIT_CODE];

export type LibraryRequest =
  | { kind: 'library'; command: 'config folder'; folder: string }
  | { kind: 'library'; command: 'config show' | 'config reset' }
  | { kind: 'library'; command: 'list'; query?: string };

export type CliRequest =
  | LibraryRequest
  | { kind: 'manager'; command: 'start' | 'status' | 'stop'; open: boolean }
  | { kind: 'help' }
  | { kind: 'version' }
  | { kind: 'mcp' }
  | { kind: 'all'; command: AllSessionsCommand; open?: boolean }
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
  | ({ ok: true } & import('./manager.js').ManagerStatus)
  | CommandFailure
  | import('./session.js').AllSessionsResult
  | ({ ok: true } & import('./library.js').LibraryResult);
