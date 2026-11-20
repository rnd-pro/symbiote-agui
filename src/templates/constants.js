export const TEMPLATE_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export let TEMPLATE_COMMANDS = Object.freeze({
  list: {
    usage: 'templates list [--query <TEXT>]',
    options: [
      'query',
    ],
  },
  describe: {
    usage: 'templates describe <TEMPLATE_ID>',
    options: [],
  },
  create: {
    usage: 'templates create <TEMPLATE_ID> <SESSION_ID> [--config <JSON_PATH>]',
    options: [
      'config',
    ],
  },
});
