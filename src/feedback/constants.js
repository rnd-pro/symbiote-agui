import { MAX_EVENT_BYTES, MAX_EVENTS } from '../transport/constants.js';

export let FEEDBACK_STATE = Object.freeze({ DISABLED: 'disabled', READY: 'ready', UNAVAILABLE: 'unavailable' });
export let DELIVERY_STATE = Object.freeze({ QUEUED: 'queued', ACCEPTED: 'accepted', REJECTED: 'rejected', UNKNOWN: 'unknown' });
export let FEEDBACK_LIMITS = Object.freeze({
  bytes: MAX_EVENT_BYTES,
  pending: 16,
  receipts: MAX_EVENTS,
  executionMs: 10_000,
  outputBytes: 8_192,
  killGraceMs: 250,
  jsonDepth: 32,
});
export let FEEDBACK_FAILURES = Object.freeze({
  DISABLED: 'Feedback is disabled. Changes remain local.',
  UNAVAILABLE: 'The originating conversation is unavailable. Feedback was disabled.',
  INVALID_SUBMISSION: 'Invalid feedback submission or conflicting submission ID.',
  STALE_INSTANCE: 'Feedback targets a different session instance.',
  QUEUE_FULL: 'The feedback queue is full. Changes remain pending.',
  COMMAND_FAILED: 'The feedback command could not start. No delivery was attempted.',
  DELIVERY_UNKNOWN: 'Delivery could not be confirmed. Reconcile before retrying.',
});
export let FEEDBACK_ENVIRONMENT = Object.freeze([
  'PATH', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'SystemRoot', 'WINDIR',
  'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'CODEX_HOME', 'XDG_CONFIG_HOME', 'XDG_STATE_HOME',
]);

/** @param {keyof typeof FEEDBACK_FAILURES} code */
export function feedbackFailure(code) {
  return { code, message: FEEDBACK_FAILURES[code] };
}
