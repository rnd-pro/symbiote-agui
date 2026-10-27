import type { COMMANDS, ALL_COMMANDS } from '../src/cli/commands.js';
import type { ERROR_CODE, EXIT_CODE } from '../src/shared/constants.js';
import type { SessionStatus } from './session.js';

export type SessionCommand = keyof typeof COMMANDS;
export type AllSessionsCommand = keyof typeof ALL_COMMANDS;
export type ErrorCode = typeof ERROR_CODE[keyof typeof ERROR_CODE];
export type ExitCode = typeof EXIT_CODE[keyof typeof EXIT_CODE];
export type ManagerCommand = 'start' | 'status' | 'stop' | 'restart';

export type LibraryRequest =
  | { kind: 'library'; command: 'config folder'; folder: string }
  | { kind: 'library'; command: 'config show' | 'config reset' }
  | { kind: 'library'; command: 'list'; query?: string };

export type FeedbackCliRequest =
  | { kind: 'feedback'; command: 'check'; sessionId: string; conversationId: string }
  | { kind: 'feedback'; command: 'configure'; sessionId: string; file?: string }
  | { kind: 'feedback'; command: 'status' | 'disable'; sessionId: string };

export type MetadataCliRequest =
  | { kind: 'metadata'; command: 'get'; sessionId: string }
  | { kind: 'metadata'; command: 'set'; sessionId: string; file?: string }
  | { kind: 'metadata'; command: 'clear'; sessionId: string; key: string };

export type CliRequest =
  | { kind: 'rename'; sessionId: string; destinationSessionId: string }
  | LibraryRequest
  | FeedbackCliRequest
  | MetadataCliRequest
  | { kind: 'manager'; command: ManagerCommand; open: boolean }
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
    resetData?: boolean;
  };

export interface CommandFailure {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

export type CommandResult = ({ ok: true } & (SessionStatus | import('./tools.js').SessionToolResponse))
  | import('./session.js').SessionRenameResult
  | (CommandFailure & SessionStatus)
  | ({ ok: true } & import('./manager.js').ManagerStatus)
  | CommandFailure
  | import('./session.js').AllSessionsResult
  | ({ ok: true } & import('./library.js').LibraryResult)
  | ({ ok: true } & import('./metadata.js').SessionMetadataResult);
