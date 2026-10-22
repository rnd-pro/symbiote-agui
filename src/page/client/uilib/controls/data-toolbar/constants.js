/** @type {1} */
export let TRANSFER_VERSION = 1;
export let DOWNLOAD_RELEASE_MS = 1_000;
export let MESSAGE_TIMEOUT_MS = 5_000;
export let MESSAGE_KEYS = Object.freeze([
  'editMessage',
  'localMessage',
  'deliveryMessage',
  'externalMessage',
  'transferMessage',
  'errorMessage',
]);
export let TRANSFER_FAILURES = Object.freeze({
  INVALID_JSON: 'INVALID_JSON',
  TOO_LARGE: 'TOO_LARGE',
  INVALID_TARGET: 'INVALID_TARGET',
  INVALID_DESTINATION: 'INVALID_DESTINATION',
  CONTEXT_CHANGED: 'CONTEXT_CHANGED',
  READ_FAILED: 'READ_FAILED',
  APPLY_FAILED: 'APPLY_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
});

/** @param {keyof typeof TRANSFER_FAILURES} code */
export function transferError(code) { return Object.assign(new Error(TRANSFER_FAILURES[code]), { code }); }
