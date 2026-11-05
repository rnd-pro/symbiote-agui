import { ASSET_LIMITS } from '../../assets/constants.js';

export let TRANSFER_RECEIPT_BYTES = ASSET_LIMITS.manifestBytes * 2 + 16384;

/** @type {readonly ['connectors', 'proxy', 'metadata', 'data', 'description', 'html']} */
export const TRANSFER_FILE_KEYS = [
  'connectors',
  'proxy',
  'metadata',
  'data',
  'description',
  'html',
];

export let TRANSFER_OPERATIONS = Object.freeze({
  'rename session': {
    bulk: false,
    confirm: true,
  },
  'copy session': {
    bulk: false,
    confirm: true,
  },
  'move session': {
    bulk: false,
    confirm: true,
  },
  'transfer history': {
    bulk: false,
    confirm: false,
  },
  'recover transfer': {
    bulk: false,
    confirm: true,
  },
});
