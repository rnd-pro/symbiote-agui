/** @type {readonly ['proxy', 'metadata', 'data', 'description', 'html']} */
export const TRANSFER_FILE_KEYS = [
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
