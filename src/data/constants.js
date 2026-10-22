export let DATA_CONTEXT = 'AGUI_DATA';
export let PERSIST_ATTRIBUTE = 'persist';
export let DATA_LIMITS = Object.freeze({ bytes: 1024 * 1024, depth: 32, targets: 32, keys: 64, pending: 16, receipts: 100, timeoutMs: 20_000 });
export let DATA_FAILURES = Object.freeze({
  INVALID_DATA: 'The data commit is invalid or exceeds its limits.',
  INVALID_TARGET: 'Only declared JSON-backed provider properties can be saved.',
  STALE_INSTANCE: 'The worker changed. Reconcile saved data before submitting again.',
  STALE_MARKUP: 'The interface changed. Reload before saving these edits.',
  STALE_DATA: 'Another submission changed the saved data. Reconcile before saving.',
  SOURCE_CHANGED: 'The saved definition changed. Sync the interface before saving.',
  CACHE_FAILED: 'Could not persist the snapshot. Edits remain unsaved.',
  DISCONNECTED: 'The page is disconnected. Edits remain unsaved.',
  PAGE_BUSY: 'The page is processing an agent command. Try an explicit Save when it finishes.',
  QUEUE_FULL: 'The data commit queue is full. Edits remain unsaved.',
  SESSION_STOPPED: 'The session is stopping. Reconcile the saved snapshot before retrying.',
  UNKNOWN_COMMIT: 'Persistence is uncertain. Reconcile saved data before retrying.',
});

/** @param {keyof typeof DATA_FAILURES} code */
export function dataFailure(code) { return { code, message: DATA_FAILURES[code] }; }
