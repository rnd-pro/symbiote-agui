export let COMMANDS = Object.freeze({
  start: {
    usage: 'start <SESSION_ID> [--no-open] [--tunnel]',
    options: ['no-open', 'tunnel'],
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
  share: {
    usage: 'share <SESSION_ID>',
    options: [],
  },
  'tunnel renew': {
    usage: 'tunnel renew <SESSION_ID>',
    options: [],
  },
  'tunnel check': {
    usage: 'tunnel check <SESSION_ID>',
    options: [],
  },
  pages: {
    usage: 'pages <SESSION_ID>',
    options: [],
  },
  tools: {
    usage: 'tools <SESSION_ID> [--page <PAGE_ID>]',
    options: ['page'],
  },
  call: {
    usage: 'call <SESSION_ID> [--file <PATH>]',
    options: ['file'],
  },
  stop: {
    usage: 'stop <SESSION_ID>',
    options: [],
  },
  clear: {
    usage: 'clear <SESSION_ID>',
    options: [],
  },
});

export let ALL_COMMANDS = Object.freeze({
  'tunnel renew all': { usage: 'tunnel renew all', options: [] },
  'tunnel check all': { usage: 'tunnel check all', options: [] },
  'start all': { usage: 'start all [--no-open]', options: ['no-open'] },
  'status all': { usage: 'status all', options: [] },
  'stop all': { usage: 'stop all', options: [] },
  'stop-all': { usage: 'stop-all', options: [] },
  'clear-all': { usage: 'clear-all', options: [] },
});

export let HELP = [
  'Usage: symbiote-agui <command>',
  '',
  ...Object.values(COMMANDS).map(({ usage }) => `  ${usage}`),
  ...Object.values(ALL_COMMANDS).map(({ usage }) => `  ${usage}`),
  '  mcp                         Run the MCP server over stdio',
  '',
  '  --help, -h     Show help',
  '  --version, -v  Show version',
  '',
  'insert reads UTF-8 HTML from stdin when --file is absent.',
  'insert replaces the session content; input is limited to 1 MiB.',
  'update reads JSON { selector, values, method?, rewrite? } from file or stdin.',
  'events returns and clears buffered interface events.',
  'start all restores saved sessions, reuses running workers, and opens their pages unless --no-open.',
  'status all lists running and saved sessions with active flags and current links for running sessions.',
  'pages lists connected tabs; tools discovers one tab (use --page with several tabs).',
  'call reads JSON { pageId, discoveryId, name, input } from file or stdin.',
  'call targets one page, validates tool input, and never retries automatically.',
  'Open the returned URL directly; browser authorization is not required.',
  'stop retains cached markup; clear removes the saved interface and live content.',
  'stop all (also stop-all) stops recorded sessions; clear-all clears running and cached interfaces.',
  'Both use the current state directory and report per-session results.',
  'start --tunnel or share creates a public Quick Tunnel with user and viewer links.',
  'tunnel renew recreates public links; tunnel check verifies public reachability without recreating.',
  'Tunnel all commands target running sessions already configured for sharing.',
  'status checks configured tunnels; tunnel.active reports reachability independently of connector state.',
  'cloudflared is used from PATH or downloaded and verified once; stop closes the tunnel.',
].join('\n');
