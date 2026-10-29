export let COMMANDS = Object.freeze({
  save: { usage: 'save <SESSION_ID> [--file <HTML_PATH>]', options: ['file'] },
  describe: { usage: 'describe <SESSION_ID> [--file <MARKDOWN_PATH>]', options: ['file'] },
  sync: { usage: 'sync <SESSION_ID> [--reset-data]', options: ['reset-data'] },
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

export let RENAME_USAGE = 'rename <SESSION_ID> <NEW_SESSION_ID>';

export let ALL_COMMANDS = Object.freeze({
  'sync all': { usage: 'sync all', options: [] },
  'tunnel renew all': { usage: 'tunnel renew all', options: [] },
  'tunnel check all': { usage: 'tunnel check all', options: [] },
  'start all': { usage: 'start all [--no-open]', options: ['no-open'] },
  'status all': { usage: 'status all', options: [] },
  'stop all': { usage: 'stop all', options: [] },
  'stop-all': { usage: 'stop-all', options: [] },
  'clear-all': { usage: 'clear-all', options: [] },
});

export let FEEDBACK_COMMANDS = Object.freeze({
  check: {
    usage: 'feedback check <SESSION_ID> --conversation <CONVERSATION_ID>',
    options: [
      'conversation',
    ],
  },
  configure: { usage: 'feedback configure <SESSION_ID> [--file <PATH>]', options: ['file'] },
  status: { usage: 'feedback status <SESSION_ID>', options: [] },
  disable: { usage: 'feedback disable <SESSION_ID>', options: [] },
});

export let METADATA_COMMANDS = Object.freeze({
  get: { usage: 'metadata get <SESSION_ID>', options: [] },
  set: { usage: 'metadata set <SESSION_ID> [--file <PATH>]', options: ['file'] },
  clear: { usage: 'metadata clear <SESSION_ID> --key dataFlow', options: ['key'] },
});

export const PROXY_COMMANDS = Object.freeze({
  allow: {
    usage: 'proxy allow <SESSION_ID> <ORIGIN>',
  },
  remove: {
    usage: 'proxy remove <SESSION_ID> <ORIGIN>',
  },
  status: {
    usage: 'proxy status <SESSION_ID>',
  },
});

export let HELP = [
  'Usage: symbiote-agui <command>',
  '',
  ...Object.values(COMMANDS).map(({ usage }) => `  ${usage}`),
  `  ${RENAME_USAGE}`,
  ...Object.values(ALL_COMMANDS).map(({ usage }) => `  ${usage}`),
  ...Object.values(FEEDBACK_COMMANDS).map(({ usage }) => `  ${usage}`),
  ...Object.values(METADATA_COMMANDS).map(({ usage }) => `  ${usage}`),
  ...Object.values(PROXY_COMMANDS).map(({ usage }) => `  ${usage}`),
  '  manager [--no-open]          Open the built-in local session manager',
  '  manager status              Show the manager URL and storage scope',
  '  manager stop                Stop the manager without stopping sessions',
  '  manager restart [--no-open]  Restart the manager without stopping sessions',
  '  list [--query <TEXT>]        Discover saved AGUIs by ID or Markdown description',
  '  config folder <PATH>         Set the project AGUI folder in .agui.json',
  '  config show                  Show effective storage settings',
  '  config reset                 Remove the project folder setting',
  '  mcp                         Run the MCP server over stdio',
  '',
  '  --help, -h     Show help',
  '  --version, -v  Show version',
  '',
  'insert reads UTF-8 HTML from stdin when --file is absent.',
  'save stores a definition without starting it; without --file it saves existing content or imports the private cache.',
  'describe reads or replaces the Markdown description; accepted inserts preserve existing descriptions.',
  'metadata get/set/clear read or edit private session data-flow descriptions without starting a worker.',
  'metadata set reads JSON from file or stdin; supplied fields replace those fields, leaving others unchanged.',
  'metadata clear --key dataFlow removes only data-flow metadata, not application data or the description.',
  'proxy allow/remove configures saved public source origins; status reports policy, limits, and forwarding availability.',
  'sync reloads saved HTML into running sessions without rewriting source files or running Git commands.',
  'AGUI_LIBRARY_DIR overrides the project folder; without a folder, private caching remains the default.',
  'insert replaces the session content; input is limited to 1 MiB.',
  'update reads JSON { selector, values, method?, rewrite? } from file or stdin.',
  'events returns and clears buffered interface events.',
  'feedback configure reads private JSON from file or stdin; registration lasts only for the current worker.',
  'feedback status and disable require a running session; only explicit browser submissions invoke the handler.',
  'feedback check verifies the current conversation binding without delivery; exits 1 when configuration or reconnection is needed.',
  'start all restores saved sessions, reuses running workers, and opens their pages unless --no-open.',
  'status all lists running and saved sessions with active flags and current links for running sessions.',
  'pages lists connected tabs; tools discovers one tab (use --page with several tabs).',
  'call reads JSON { pageId, discoveryId, name, input } from file or stdin.',
  'call targets one page, validates tool input, and never retries automatically.',
  'Open the returned URL directly; browser authorization is not required.',
  'stop retains cached markup; clear removes the saved interface and live content.',
  'rename requires a stopped saved session; it retains description, committed data, and metadata in the same scope.',
  'stop all (also stop-all) stops recorded sessions; clear-all clears running and cached interfaces.',
  'Both use the current state directory and report per-session results.',
  'start --tunnel or share creates a public Quick Tunnel with user and viewer links.',
  'tunnel renew recreates public links; tunnel check verifies public reachability without recreating.',
  'Tunnel all commands target running sessions already configured for sharing.',
  'status checks configured tunnels; tunnel.active reports reachability independently of connector state.',
  'cloudflared is used from PATH or downloaded and verified once; stop closes the tunnel.',
].join('\n');
