export let SESSION_STATE = Object.freeze({
  READY: 'ready',
  DISCONNECTED: 'disconnected',
  STOPPED: 'stopped',
});

export let SESSION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

export let STARTUP_TIMEOUT_MS = 30_000;
export let CONTROL_TIMEOUT_MS = 2_000;
export let SHUTDOWN_TIMEOUT_MS = 10_000;
export let PROTOCOL_TIMEOUT_MS = 15_000;
