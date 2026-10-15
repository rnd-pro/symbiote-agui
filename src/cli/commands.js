export let COMMANDS = Object.freeze({
  start: {
    usage: 'start <SESSION_ID> [--browser-path <PATH> | --cdp-url <URL>]',
    options: ['browser-path', 'cdp-url'],
  },
  insert: {
    usage: 'insert <SESSION_ID> [--file <PATH>]',
    options: ['file'],
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
].join('\n');
