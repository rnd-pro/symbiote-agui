export let SESSION_STATE = Object.freeze({
  READY: 'ready',
  DISCONNECTED: 'disconnected',
  STOPPED: 'stopped',
});

export let SESSION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
