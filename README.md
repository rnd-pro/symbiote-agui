# AGUI - Agentic Generative User Interface

> Create interactive browser interfaces from an AI agent.

AGUI lets AI agents create and update interactive interfaces in regular browser pages. Use the CLI to deliver markup, update component state, and retrieve user interaction events. Use `tools` and `call` to discover and invoke Symbiote component tools through the page's existing WebSocket connection. No MCP harness setup is required; an optional stdio MCP server exposes the same operations. Named sessions save their interface definition for reuse after restart.

## Usage with npx

Use Node.js 24 or newer. With an HTML fragment in `view.html` and a JSON state command in `state.json`, run from any directory. See the [interactive counter](#interactive-counter) for a complete example using stdin instead of files.

```sh
npx symbiote-agui start demo
npx symbiote-agui insert demo --file ./view.html
npx symbiote-agui update demo --file ./state.json
npx symbiote-agui events demo
npx symbiote-agui status demo
npx symbiote-agui stop demo
```

File paths resolve from your current directory; session data lives under `~/.symbiote-agui`. Starting the same ID restores its saved interface. Use `npx symbiote-agui clear demo` to forget it. Use `--no-open` on `start` to open the returned `authorizationUrl` yourself.

## Agent setup

Load the portable [Symbiote AGUI skill](./skills/symbiote-agui/SKILL.md) in the agent's harness, or copy its folder from the installed package into the harness's skill directory. The agent needs access to a shell to run the CLI.

`start` opens and authorizes the session in the OS default browser. With `start demo --no-open`, open the returned `authorizationUrl` manually. If opening fails, the server remains available and the result includes `opened: false`, a warning, and `authorizationUrl`.

### Operate page tools with npx

```sh
npx symbiote-agui pages demo
npx symbiote-agui tools demo
npx symbiote-agui tools demo --page <PAGE_ID>
npx symbiote-agui call demo --file ./call.json
```

`tools` selects the only connected page automatically. With several pages, choose a `pageId` from `pages` and pass `--page`. Discovery returns tool names, descriptions, input schemas, `pageId`, and `discoveryId`. The call JSON contains `{ "pageId": "...", "discoveryId": "...", "name": "...", "input": {} }`; use the returned IDs, exact tool name, and schema-compatible input. `call` also accepts JSON on stdin, limited to 1 MiB. See the [WebMCP example](#webmcp) for a complete call.

Calls target one page and use the same authenticated worker and WebSocket as content delivery. Native browser WebMCP, remote debugging, and a configured MCP server are optional. Reuse the IDs until the catalog changes; rediscover after replacement or visibility changes and select the current page after reload, reconnection, or restart. Discovery waits for queued rendering and bounded catalog stabilization; discover again after initialization if an expected async tool is still absent. Page requests have a 10-second timeout and worker tool operations a 25-second limit. A timeout, disconnection, or unserializable result can leave the outcome unknown; do not retry automatically. Browser results are limited to 1 MiB; `undefined` results become `null`.

### Routine agent workflow

1. Start a named session with `npx symbiote-agui start demo` and check `ok` and `restored`. For `SESSION_EXISTS`, use `npx symbiote-agui status demo` once to reuse a session belonging to the task or choose another ID.
2. Reuse an owned running session or restored interface without regenerating or reinserting it. Insert markup for a new or deliberately changed definition; use `update` for small state changes.
3. Discover tools with `npx symbiote-agui tools demo`. If several pages are connected, run `npx symbiote-agui pages demo` and select one with `tools demo --page <PAGE_ID>`. Keep the returned `pageId`, `discoveryId`, names, and schemas.
4. Run `npx symbiote-agui call demo` with JSON on stdin or `--file`, containing those IDs, the discovered name, and schema-compatible `input`. Check `ok` and use `result` as confirmation. Reuse the selected IDs while current; select again after reload, reconnection, or restart.
5. For user interaction, read `npx symbiote-agui events demo` and process the relevant data. Events return immediately and clear the queue; an empty batch means no new input. Check again when interaction is expected, without tight polling. Leave the session available while the user interacts; use `stop` when finished and `clear` when the saved definition should be discarded.

Tool results and CLI events usually provide confirmation without repeated status checks, DOM inspection, screenshots, or unrelated commands. A call with an unknown outcome requires checking the result before another invocation, including through a different control route.

### Optional: Connect AGUI MCP

Run `npx symbiote-agui --help` once and accept npm's installation prompt if shown. Configure an MCP server in your agent harness with command `npx` and arguments `symbiote-agui`, `mcp`, then reconnect the harness to load its tools. The server communicates over stdio; diagnostics go to stderr. Use the same `AGUI_STATE_DIR` as your CLI commands when overriding session storage.

The server exposes three tools:

- `list_pages({ sessionId })` returns connected pages with their `pageId`, URL, title, and readiness.
- `list_tools({ sessionId, pageId? })` returns Symbiote tool names, descriptions, schemas, and a `discoveryId`. With one connected page, `pageId` is selected automatically. With several, choose one from `list_pages`.
- `call_tool({ sessionId, pageId, discoveryId, name, input })` validates arguments against the discovered schema and invokes that tool on the selected page. Results are returned as text JSON and structured content; Symbiote errors also set MCP's `isError` flag.

The optional server uses the same page targeting, validation, timeouts, and result limits as the CLI.

### Optional: Connect Chrome DevTools MCP

For native browser WebMCP access or browser inspection, connect Chrome DevTools MCP to the same Chrome profile that contains the session page.

1. Use Chrome with WebMCP enabled, following the [Chrome WebMCP setup](https://developer.chrome.com/docs/devtools/agents/webmcp-debugging).
2. Open `chrome://inspect/#remote-debugging` in Chrome and enable remote debugging.
3. Run `npx chrome-devtools-mcp --help` once to install the MCP runner; accept npm's installation prompt if shown.
4. Add the MCP server to your agent harness with command `npx` and arguments `chrome-devtools-mcp`, `--autoConnect`, and `--categoryExperimentalWebmcp`.
5. Reconnect or restart the harness to load its MCP configuration. Approve Chrome's connection prompt when the agent first accesses the browser.

For Codex, add this server to your MCP settings in `~/.codex/config.toml`:

```toml
[mcp_servers.chrome-devtools]
command = "npx"
args = ["chrome-devtools-mcp", "--autoConnect", "--categoryExperimentalWebmcp"]
enabled_tools = ["list_pages", "list_webmcp_tools", "execute_webmcp_tool"]
startup_timeout_sec = 60
tool_timeout_sec = 60
```

The agent needs `list_pages` to select the session URL, `list_webmcp_tools` to discover actions, and `execute_webmcp_tool` to invoke them. Confirm these tools are available in the agent's tool list. Keep the MCP connection for subsequent actions. Apple Events access is not required.

On macOS, a missing `DevToolsActivePort` error can mean the system has blocked access to Chrome's data. In System Settings, open Privacy & Security > Files & Folders and allow Google Chrome access for the app running the MCP server, such as Codex. Retry the connection after granting that permission. See the [Chrome MCP access issue](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/3089).

See the [Chrome connection instructions](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/advanced-usage.md#automatically-connecting-to-a-running-chrome-instance) and [Codex MCP settings](https://developers.openai.com/codex/mcp) for your harness's connection controls.

## Sessions and commands

### Commands and results

- IDs are case-sensitive names matching `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`, unique for the current OS user across working directories. Duplicate starts return `SESSION_EXISTS`.
- `start` starts a session and returns its URL, restoring cached markup and rebuilding its styles when available. `restored: true` confirms restoration; `false` means no cached definition was found. It does not wait for a browser connection; use the returned state to distinguish a waiting session from one with connected pages. Startup has a 30-second timeout.
- `insert` reads a UTF-8 HTML fragment from `--file` or stdin, limited to 1 MiB. Relative paths resolve from the caller's working directory. Empty input clears the content root. Interactive stdin requires a file or redirected input.
- Each insertion replaces generated content, resets local state, and atomically saves the accepted fragment, including inline modules. With connected pages, success waits for their acknowledgements and returns `delivery: "applied"`. Without a page, it saves the fragment and returns `delivery: "queued"`; rendering and module execution happen on connection.
- `update` reads a JSON state command from file or stdin with the same size limit. It requires at least one connected page and waits for acknowledgements. It does not replace markup.
- `events` returns and clears buffered UI events. The worker retains the most recent 100 events, each limited to 16 KiB; `dropped` reports overflow since the previous read. Events are temporary, not a durable log.
- `status` returns `waiting` when the worker is running without connected pages, `ready` when pages are connected, and `stopped` when the worker is absent. Running results include `url` and `clients`.
- `pages` lists connected pages, URLs, titles, and readiness. `tools` discovers one page, optionally selected with `--page`.
- `call` reads JSON `{ pageId, discoveryId, name, input }` from file or stdin and invokes one discovered tool. Invalid or stale requests are rejected; no automatic retries occur. Native tool errors return `ok: false`, `TOOL_FAILED`, and the original `result`, with exit code 1.
- `mcp` runs the optional MCP server over stdio until its client disconnects. Session lifecycle remains available through the CLI commands above.
- `stop` is idempotent. It clears live content and tools, notifies pages, closes connections and servers, and removes worker metadata and credentials. It retains the cached interface and leaves browser tabs open.
- `clear` removes the cached definition and live content/tools, returning `cleared: true`. A running session stays available for new insertions. It also works on stopped sessions and is idempotent. An empty `insert` saves a blank definition; use `clear` to remove it entirely.

Session commands other than `mcp` write one JSON object to stdout. Success includes `{ "ok": true, "sessionId": "demo", "state": "waiting", "url": "http://127.0.0.1:PORT/demo/", "clients": 0 }`. Failures include `{ "ok": false, "error": { "code": "...", "message": "..." } }`. Exit codes are 0 for success, 1 for runtime failure, and 2 for invalid input. Help and version return plain text; diagnostics go to stderr or the worker log. The `mcp` command reserves stdout for MCP protocol messages.

### Connection and recovery

The page address contains your named session ID, for example `http://127.0.0.1:PORT/demo/`. The ID stays the same when restarted; the port can change. It identifies the interface and is separate from the worker's numeric OS process ID.

Browser authorization uses a private `authorizationUrl` containing a token fragment. Opening it removes the token from the address bar and establishes an HttpOnly cookie scoped to that session. Reloads, reconnections, and new tabs in the authorized browser use the readable `url`. Another browser or profile, or cleared cookies, requires authorization again:

```sh
npx symbiote-agui status demo --authorize
```

Open its `authorizationUrl` in the intended browser. Keep this link private; knowing the readable session ID does not grant access to generated content.

Pages reconnect automatically with a bounded retry delay. Reload, reconnect, or opening another tab restores the latest accepted markup and reruns its marked modules. Live component state resets to the values in that markup; `update` commands are not replayed. Restarting the same session ID restores its cached definition without the original input file.

Validation and stylesheet loading happen before content replacement, preserving the current interface if either fails. Module code can have side effects; an execution failure can leave changed content. Delivery to several tabs and state updates are not transactions. After a failed or timed-out delivery, inspect the pages or reload the session URL before retrying. A queued insertion cannot verify browser-specific behavior until a page connects.

Use `status` after `SESSION_EXISTS`; reuse a session belonging to the task or choose another ID. Start a stopped session before inserting. For `PAGE_UNAVAILABLE`, open the session URL. For `INSERT_FAILED` or `UPDATE_FAILED`, correct the reported problem. If the worker stays `SESSION_UNREACHABLE`, inspect its log rather than repeatedly starting it or killing a stored PID.

Cache read, markup validation, and style compilation failures stop startup and retain the saved definition. Browser rendering and module execution happen after a page connects; their failures appear as `agui:error` events. `CACHE_ERROR` reports storage failures; resolve the reported path or permission problem before retrying. Failed insertions preserve the previous accepted cache. If saving fails after browser delivery, the page may already have changed; reloading restores the last accepted interface. Use `clear` only when you intend to discard the saved definition.

## Markup, RAT, and interactivity

Use standard HTML and complete Tailwind classes such as `p-4`, `md:grid-cols-2`, and `w-[123px]`. Classes are collected from inserted markup, including nested templates, and compiled locally. Classes added later by JavaScript are not detected. Styles accumulate for the session lifetime. Success does not wait for external images or asynchronous widgets.

`<agui-component>` supports inline RAT markup. One direct child `<script type="text/json">` or `<script type="application/json">` initializes an object with plain local state keys. Use `{{prop}}` for text, `bind="onclick: handler"` for events, and native Symbiote APIs for state:

- `element.$.prop = value` updates one existing field; scoped fields use `element.$['map/lat']` or `element.$['*lat']`.
- `element.set$({ count: 10 })` updates existing local fields. A second argument of `true` forces unchanged primitive notifications.
- `element.add$({ newField: value })` adds fields. Pass `true` as the second argument to also overwrite existing ones.

Executable scripts inserted as ordinary markup remain inert. Explicitly opt into inline modules with `<script type="module" data-agui>`. Place these modules outside templates. Module-scope code runs before mounting so it can register component classes; a default exported function receives `(root, { emit })` after mounting and may return a cleanup function, including an async function, for replacement or graceful stop. Modules execute from generated Blob URLs. Resolve imports to full URLs, for example `await import(new URL('/client/index.js', location.href).href)`; root-relative imports alone do not resolve from a Blob URL. That entry exports `AguiComponent`, `ContextProvider`, `Symbiote`, `PubSub`, `html`, `css`, `emit`, `ToolDescriptor`, `getActiveWebMCPTools`, and `webMCPRegistry`.

### Interactive counter

After starting `demo`, insert this fragment:

```sh
npx symbiote-agui insert demo <<'HTML'
<agui-component id="counter" class="block p-8">
  <script type="application/json">{"count":0,"increment":null}</script>
  <button type="button" class="rounded bg-blue-600 p-4 text-white" bind="onclick: increment">
    Count: {{count}}
  </button>
</agui-component>
<script type="module" data-agui>
export default (root, { emit }) => {
  let counter = root.querySelector('#counter');
  counter.set$({
    increment: () => {
      counter.$.count += 1;
      emit('count', { count: counter.$.count });
    },
  });
};
</script>
HTML
```

Clicking increments the count and queues a `count` event. Read events and update state from the agent's shell:

```sh
npx symbiote-agui events demo
printf '%s\n' '{"selector":"#counter","values":{"count":10}}' | npx symbiote-agui update demo
```

An update selects components inside the content root and calls their native `set$()` method. Use `"method":"add$"` to add fields and `"rewrite":true` to overwrite existing ones. Functions belong in modules; state commands contain JSON values. `emit()` returns `false` when the connection is unavailable and does not buffer events in the page.

### Contexts and templates

An anonymous provider exposes local fields to descendants through `^` bindings. A named provider also mirrors its local state into a shared context; keep one provider per named context. Shared updates and provider updates synchronize in both directions, including fields added through `add$()`.

```html
<context-provider id="map-data" ctx="map">
  <script type="application/json">{"lat":10,"lon":20}</script>
  <agui-component><output>{{^lat}}, {{^lon}}</output></agui-component>
</context-provider>
<agui-component ctx="map"><output>{{*lat}}, {{*lon}}</output></agui-component>
<agui-component><output>{{map/lat}}</output></agui-component>
```

Use templates in the same insertion for reusable markup. Unknown custom tags with `use-template` are registered as generic components. For custom behavior, register a subclass of `AguiComponent` with `YourComponent.reg('your-component')` in a marked module; registrations persist for the page lifetime. Symbiote's `reg()` also supplies the tag identity used by WebMCP. Replacement resets provider-owned contexts and removes old subscriptions.

```html
<template id="user_card_template">
  <div>{{userName}}</div>
  <div>{{userAge}}</div>
</template>
<user-card use-template="template#user_card_template">
  <script type="application/json">{"userName":"Alex","userAge":42}</script>
</user-card>
```

### WebMCP

The browser entry imports Symbiote's [WebMCP extension](https://github.com/symbiotejs/symbiote.js/blob/main/docs/webmcp.md) before rendering and enables `Symbiote.mcpToolMode`. Symbiote automatically exposes bound handlers as tools; the counter above exposes `increment_in_agui-component`. The CLI can discover and invoke them without native browser WebMCP. When the native API is available, Symbiote also registers them there. Popup bindings such as `^increment` retain their ancestor owner and source component identity.

For explicit descriptions, input schemas, and visibility, initialize native `ToolDescriptor` values in a component's `init$`. For example, insert:

```html
<tool-counter><output>Count: {{count}}</output></tool-counter>
<script type="module" data-agui>
let { AguiComponent, ToolDescriptor } = await import(new URL('/client/index.js', location.href).href);
if (!customElements.get('tool-counter')) {
  class ToolCounter extends AguiComponent {
    componentDescription = 'The visible counter.';
    init$ = {
      count: 0,
      canSet: true,
      set_count: new ToolDescriptor({
        description: 'Set the counter value.',
        deps: ['canSet'],
        when: () => this.$.canSet,
        inputSchema: {
          type: 'object',
          properties: { count: { type: 'integer' } },
          required: ['count'],
          additionalProperties: false,
        },
        execute: ({ count }) => { this.$.count = count; return { count }; },
      }),
    };
  }
  ToolCounter.reg('tool-counter');
}
</script>
```

This exposes `set_count_in_tool-counter`. Include every state key read by `when()` in `deps`; visibility is not tracked automatically. Descriptors in named `PubSub` contexts register once per context; delete module-owned contexts in the module cleanup. Symbiote removes component tools on replacement and stop. Define descriptors before first render: immediately adding and syncing them after mount can abort a pending native registration.

Use the CLI `tools` and `call` commands to operate these tools in an ordinary browser. For native WebMCP access, follow the [optional Chrome DevTools MCP setup](#optional-connect-chrome-devtools-mcp).

For the counter above, run `npx symbiote-agui tools demo`, then pass its returned IDs and the exact discovered name to `call`:

```sh
npx symbiote-agui call demo <<'JSON'
{
  "pageId": "<pageId from discovery>",
  "discoveryId": "<discoveryId from discovery>",
  "name": "set_count_in_tool-counter",
  "input": { "count": 12 }
}
JSON
```

The returned `ok: true` and `result: { "count": 12 }` confirm the action and the interface displays `Count: 12`. Keep the selected IDs for subsequent calls while the catalog remains current. With optional Chrome MCP, select the page matching the session URL, discover through `list_webmcp_tools`, and invoke through `execute_webmcp_tool`. The CLI handles sessions, markup, state updates, and events.

For browser-side integrations, `/client/index.js` exports `listPageTools()` and async `executePageTool(name, input = {})`. They forward Symbiote's public discovery and invocation APIs and work without native browser WebMCP. Discovery preserves names, descriptions, and schemas; execution preserves results and Symbiote's `isError` responses. Callers validate inputs against the discovered schemas. Replacement and stop remove tools from discovery and invocation.

The entry also exports Symbiote's `executeWebMCPTool()`, `getActiveWebMCPTools()`, and `webMCPRegistry`. Registry entries report `nativeActive` for native browser registration. WebMCP remains experimental.

## Session storage

Worker metadata and logs live under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`. Cached HTML lives under `~/.symbiote-agui/sessions/.cache/<HEX_SESSION_ID>.html`, outside disposable worker directories. Set the same absolute `AGUI_STATE_DIR` for all commands and MCP to use another storage root; its cache is stored in `.cache/`. Session IDs remain case-sensitive.

`stop` retains cached HTML and discards live state and events. Starting the same ID rebuilds styles, restores the saved HTML and inline modules, and authorizes the browser for the new session. The original source file is not needed. This restores the interface definition with its initial state; user progress, timers, closures, and state updates are not persisted. `clear` removes the saved definition.

Keep authorization URLs and tokens private.
