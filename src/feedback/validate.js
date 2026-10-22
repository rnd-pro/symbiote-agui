import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute } from 'node:path';
import { CommandError } from '../shared/command-error.js';
import { FEEDBACK_LIMITS } from './constants.js';

/**
 * @param {unknown} value
 * @returns {asserts value is Record<string, unknown>}
 */
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new CommandError('Feedback input must contain plain JSON objects.');
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {string[]} required
 * @param {string[]} [optional]
 */
function keys(value, required, optional = []) {
  if (required.some((key) => !Object.hasOwn(value, key))
    || Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key))) {
    throw new CommandError('Feedback input has missing or unsupported properties.');
  }
}

/**
 * @param {unknown} value
 * @param {number} [limit]
 * @returns {asserts value is string}
 */
function text(value, limit = 256) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || value.includes('\0')) {
    throw new CommandError('Feedback identifiers and command strings must be nonempty, bounded text without NUL characters.');
  }
}

/**
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {asserts value is import('../../types/feedback.js').FeedbackJson}
 */
function json(value, depth = 0) {
  if (depth > FEEDBACK_LIMITS.jsonDepth) { throw new CommandError('Feedback JSON is nested too deeply.'); }
  if (value === null || typeof value === 'string' || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))) { return; }
  if (!Array.isArray(value)) { object(value); }
  for (let item of Array.isArray(value) ? value : Object.values(value)) { json(item, depth + 1); }
}

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

/**
 * @param {unknown} input
 * @returns {import('../../types/feedback.js').FeedbackSubmission}
 */
export function validateFeedbackSubmission(input) {
  json(input);
  object(input);
  keys(input, ['submissionId', 'instanceId', 'event'], ['revision']);
  text(input.submissionId);
  text(input.instanceId);
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(input.submissionId)) {
    throw new CommandError('Feedback submission ID must be a UUID.');
  }
  if (input.revision !== undefined && typeof input.revision !== 'string' && typeof input.revision !== 'number') {
    throw new CommandError('Feedback revision must be text or a finite number.');
  }
  object(input.event);
  keys(input.event, ['type', 'source', 'data']);
  text(input.event.type, 128);
  text(input.event.source, 128);
  if (Buffer.byteLength(JSON.stringify({ type: 'feedback-submit', submission: input })) > FEEDBACK_LIMITS.bytes) {
    throw new CommandError('Feedback submission exceeds 16 KiB.');
  }
  return structuredClone({
    submissionId: input.submissionId,
    instanceId: input.instanceId,
    ...(input.revision !== undefined ? { revision: input.revision } : {}),
    event: { type: input.event.type, source: input.event.source,
      data: /** @type {import('../../types/feedback.js').FeedbackJson} */ (input.event.data) },
  });
}
