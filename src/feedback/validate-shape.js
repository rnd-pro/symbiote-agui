import { CommandError } from '../shared/command-error.js';

/**
 * @param {unknown} value
 * @returns {asserts value is Record<string, unknown>}
 */
export function object(value) {
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
export function keys(value, required, optional = []) {
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
export function text(value, limit = 256) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || value.includes('\0')) {
    throw new CommandError('Feedback identifiers and command strings must be nonempty, bounded text without NUL characters.');
  }
}
