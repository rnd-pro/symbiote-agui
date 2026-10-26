import { PROJECT_OPERATIONS } from '../projects/constants.js';
import { TRANSFER_OPERATIONS } from '../projects/transfer/constants.js';

export let MANAGER_PATH = '/manager/';
export let MANAGER_SOCKET_PATH = '/manager/socket';
export let MANAGER_REQUEST_LIMIT = 512;
export let MANAGER_REQUEST_TTL_MS = 10 * 60_000;
export let MANAGER_CLIENT_TIMEOUT_MS = 120_000;
export let MANAGER_REFRESH_MS = 5_000;

export let MANAGER_FEEDBACK_OPERATIONS = Object.freeze({
  'feedback settings': {
    bulk: false,
    confirm: false,
    action: 'feedback/settings',
  },
  'feedback configure': {
    bulk: false,
    confirm: false,
    action: 'feedback/configure',
  },
  'feedback disable': {
    bulk: false,
    confirm: false,
    action: 'feedback/disable',
  },
});

export let MANAGER_OPERATIONS = Object.freeze({
  ...PROJECT_OPERATIONS,
  ...TRANSFER_OPERATIONS,
  ...MANAGER_FEEDBACK_OPERATIONS,
  'configure storage': {
    bulk: false,
    confirm: false,
  },
  snapshot: { bulk: false, confirm: false },
  describe: { bulk: false, confirm: false },
  start: { bulk: true, confirm: false },
  stop: { bulk: true, confirm: false },
  clear: { bulk: true, confirm: true },
  sync: { bulk: true, confirm: true },
  share: { bulk: false, confirm: false },
  'tunnel check': { bulk: true, confirm: false },
  'tunnel renew': { bulk: true, confirm: true },
});
