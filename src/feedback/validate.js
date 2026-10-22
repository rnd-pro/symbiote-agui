import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute } from 'node:path';
import { CommandError } from '../shared/command-error.js';
import { FEEDBACK_LIMITS } from './constants.js';
import { object, keys, text } from './validate-shape.js';

/**
 * @param {unknown} input
 * @param {import('../../types/feedback.js').FeedbackSessionIdentity} identity
 * @param {boolean} [registration]
 */
export function validateFeedbackIdentity(input, identity, registration = false) {
  object(input);
  keys(input, registration ? ['sessionId', 'instanceId', 'conversationId', 'command'] : ['sessionId', 'instanceId']);
  if (input.sessionId !== identity.sessionId || input.instanceId !== identity.instanceId) {
    throw new CommandError('Feedback targets a different session instance.');
  }
}

/**
 * @param {unknown} input
 * @param {import('../../types/feedback.js').FeedbackSessionIdentity} identity
 * @returns {Promise<import('../../types/feedback.js').FeedbackRegistration>}
 */
export async function validateFeedbackRegistration(input, identity) {
  validateFeedbackIdentity(input, identity, true);
  object(input);
  text(input.conversationId);
  object(input.command);
  let command = input.command;
  keys(command, ['executable', 'args', 'input'], ['cwd']);
  text(command.executable, FEEDBACK_LIMITS.bytes);
  if (!isAbsolute(command.executable)) { throw new CommandError('Feedback executable must be an absolute path.'); }
  if (!Array.isArray(command.args) || Array.from(command.args).some((arg) => typeof arg !== 'string' || arg.includes('\0'))) {
    throw new CommandError('Feedback arguments must be an array of strings without NUL characters.');
  }
  if (command.cwd !== undefined) {
    text(command.cwd, FEEDBACK_LIMITS.bytes);
    if (!isAbsolute(command.cwd)) { throw new CommandError('Feedback working directory must be an absolute path.'); }
  }
  object(command.input);
  let channel = command.input.channel;
  if (channel !== 'stdin' && channel !== 'argument') { throw new CommandError('Unsupported feedback input channel.'); }
  keys(command.input, channel === 'stdin' ? ['channel'] : ['channel', 'index']);
  if (channel === 'argument' && (!Number.isInteger(command.input.index)
    || /** @type {number} */ (command.input.index) < 0 || /** @type {number} */ (command.input.index) > command.args.length)) {
    throw new CommandError('Feedback argument index must be within the fixed argument array.');
  }
  if (Buffer.byteLength(JSON.stringify(input)) > FEEDBACK_LIMITS.bytes) { throw new CommandError('Feedback configuration exceeds 16 KiB.'); }
  try {
    if (!(await stat(command.executable)).isFile()) { throw new Error(); }
    await access(command.executable, constants.X_OK);
    if (command.cwd && !(await stat(command.cwd)).isDirectory()) { throw new Error(); }
  } catch { throw new CommandError('Feedback executable or working directory is unavailable.'); }
  return {
    ...identity,
    conversationId: input.conversationId,
    command: {
      executable: command.executable,
      args: [...command.args],
      ...(command.cwd !== undefined ? { cwd: command.cwd } : {}),
      input: channel === 'stdin' ? { channel } : { channel, index: /** @type {number} */ (command.input.index) },
    },
  };
}
