/** @type {import('../../../types/uilib.js').UiOption[]} */
export let STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'unknown', label: 'Unknown' },
];

/** @type {import('../../../types/uilib.js').UiOption[]} */
export let BULK_OPTIONS = [
  { value: 'start', label: 'Start saved sessions' },
  { value: 'stop', label: 'Stop running sessions' },
  { value: 'sync', label: 'Sync running definitions' },
  { value: 'tunnel check', label: 'Check shared tunnels' },
  { value: 'tunnel renew', label: 'Renew shared tunnels' },
  { value: 'clear', label: 'Clear saved and live content' },
];
