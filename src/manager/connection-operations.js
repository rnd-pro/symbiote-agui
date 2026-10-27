export let CONNECTION_OPERATIONS = Object.freeze({
  connections: {
    bulk: false,
    confirm: false,
  },
  'open public': {
    bulk: false,
    confirm: false,
  },
  'disconnect page': {
    bulk: false,
    confirm: true,
  },
  'stop tunnel': {
    bulk: false,
    confirm: true,
  },
  'connection tunnel check': {
    bulk: false,
    confirm: false,
  },
  'connection tunnel renew': {
    bulk: false,
    confirm: true,
  },
});
