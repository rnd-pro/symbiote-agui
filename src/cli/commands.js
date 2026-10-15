export let COMMANDS = Object.freeze({
  start: {
    usage: 'start <SESSION_ID> [--no-open]',
    options: ['no-open'],
  },
  insert: {
    usage: 'insert <SESSION_ID> [--file <PATH>]',
    options: ['file'],
  },
  update: {
    usage: 'update <SESSION_ID> [--file <PATH>]',
    options: ['file'],
  },
  events: {
    usage: 'events <SESSION_ID>',
    options: [],
  },
  status: {
    usage: 'status <SESSION_ID>',
    options: [],
  },
  stop: {
    usage: 'stop <SESSION_ID>',
    options: [],
  },
});

export let HELP = [
  'Usage: symbiote-agui <command>',
  '',
  ...Object.values(COMMANDS).map(({ usage }) => `  ${usage}`),
  '',
  '  --help, -h     Show help',
  '  --version, -v  Show version',
  '',
  'insert reads UTF-8 HTML from stdin when --file is absent.',
  'insert replaces the session content; input is limited to 1 MiB.',
  'update reads JSON { selector, values, method?, rewrite? } from file or stdin.',
  'events returns and clears buffered interface events.',
].join('\n');
