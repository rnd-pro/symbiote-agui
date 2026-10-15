import { CommandError } from '../shared/command-error.js';
import { SESSION_ID_PATTERN } from './constants.js';

/** @param {string} sessionId */
export function assertSessionId(sessionId) {
  if (sessionId.match(SESSION_ID_PATTERN)?.[0] !== sessionId) {
    throw new CommandError('SESSION_ID must be 1-64 letters, digits, underscores, or hyphens and start with a letter or digit.');
  }
}
