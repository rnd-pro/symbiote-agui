import { CommandError } from '../shared/command-error.js';
import { FEEDBACK_LIMITS } from './constants.js';
import { object, keys, text } from './validate-shape.js';

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
 * @returns {import('../../types/feedback.js').FeedbackReference}
 */
export function validateFeedbackReference(input) {
  object(input);
  keys(input, ['submissionId', 'instanceId'], ['revision']);
  text(input.submissionId);
  text(input.instanceId);
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(input.submissionId)) {
    throw new CommandError('Feedback submission ID must be a UUID.');
  }
  if (input.revision !== undefined && typeof input.revision !== 'string'
    && !(typeof input.revision === 'number' && Number.isFinite(input.revision))) {
    throw new CommandError('Feedback revision must be text or a finite number.');
  }
  return { submissionId: input.submissionId, instanceId: input.instanceId,
    ...(input.revision !== undefined ? { revision: input.revision } : {}) };
}

/**
 * @param {unknown} input
 * @returns {import('../../types/feedback.js').FeedbackSubmission}
 */
export function validateFeedbackSubmission(input) {
  json(input);
  object(input);
  keys(input, ['submissionId', 'instanceId', 'event'], ['revision']);
  let { event, ...reference } = input;
  let validated = validateFeedbackReference(reference);
  object(event);
  keys(event, ['type', 'source', 'data']);
  text(event.type, 128);
  text(event.source, 128);
  if (new TextEncoder().encode(JSON.stringify({ type: 'feedback-submit', submission: input })).byteLength > FEEDBACK_LIMITS.bytes) {
    throw new CommandError('Feedback submission exceeds 16 KiB.');
  }
  return structuredClone({ ...validated, event: { type: event.type, source: event.source,
    data: /** @type {import('../../types/feedback.js').FeedbackJson} */ (event.data) } });
}
