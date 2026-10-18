---
name: symbiote-agui
description: Create, restore, share, and operate interactive interfaces with Symbiote AGUI. Use for generated HTML, Tailwind styling, RAT templates, component state updates, and user interaction through the AGUI CLI, with optional MCP integration.
---

# Symbiote AGUI

Use AGUI to show an interface in the user's normal browser, operate its Symbiote tools, and receive user interaction events. It requires Node.js 24 or newer. Use `npx symbiote-agui` for sessions, tool discovery, invocation, and events. No MCP harness connection is required.

## Setup

Use a shell with Node.js 24 or newer. Run `npx symbiote-agui --help` once and accept npm's installation prompt if shown. The CLI operates tools through the existing WebSocket in ordinary browsers. Native WebMCP, remote debugging, and MCP server configuration are optional. Avoid ad hoc browser scripts or browser API emulation.

For routine use, prepare HTML and JSON files with workspace file tools, then run one simple command beginning with `npx symbiote-agui`, passing input with `--file`. Reuse the host's existing approval for that command prefix. Avoid heredocs, pipes, shell wrappers, and inline environment assignments in these invocations: they can prevent approval reuse. Host permissions still apply; AGUI cannot grant itself access or suppress an enforced prompt.

## Routine workflow

Choose a case-sensitive session ID matching `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`. Reuse it for the same interface; IDs are shared across working directories for the current OS user.

1. Run `npx symbiote-agui start demo`. Check `ok` and `restored`. If `SESSION_EXISTS` is returned, use `npx symbiote-agui status demo` once and reuse a session belonging to this task, or choose another ID.
2. Reuse an owned running session or a `restored: true` interface without regenerating or reinserting it. For a new or deliberately changed definition, use `npx symbiote-agui insert demo --file /absolute/path/view.html` using a prepared file. Use `update` for small state changes.
3. Run `npx symbiote-agui tools demo`. It selects a single interactive page automatically, ignoring viewers. With several interactive local-only pages, run `npx symbiote-agui pages demo`, then `npx symbiote-agui tools demo --page <PAGE_ID>`. Keep the returned `pageId`, `discoveryId`, tool names, and schemas.
4. Prepare a JSON file containing `{ "pageId": "...", "discoveryId": "...", "name": "...", "input": {} }`, then run `npx symbiote-agui call demo --file /absolute/path/call.json`. Use the exact discovered name and schema-compatible arguments. Check `ok` and use `result` as confirmation. Native tool errors preserve `result` and return `ok: false` with exit code 1. Reuse the selected page and discovery IDs for further calls while they remain current.
5. When awaiting user interaction, read `npx symbiote-agui events demo` and process the relevant events. It returns immediately and clears the queue; an empty batch means no new input. Check again when interaction is expected, without tight polling. Keep the session available while the user interacts. Stop it when the user is finished or requests cleanup.

Use tool results or CLI events when they answer the task; avoid repeated status checks, DOM inspection, screenshots, or unrelated commands. After replacement or catalog changes, rediscover tools. After reload, reconnection, or worker restart, select the current page again. Do not retry an invocation automatically when its outcome is unknown.

## Session behavior

`start` opens a regular page in the OS default browser. Its readable `url` contains the session ID, for example `http://127.0.0.1:PORT/demo/`; the port can change on restart. With `--no-open`, open the returned `url` manually. A failed opener returns `opened: false`, a warning, and the readable URLs. Pages connect directly by WebSocket without cookies, tokens, or a browser authorization step.

Session commands return one JSON object on stdout. Check `ok`; errors include `error.code` and `error.message`. Exit codes are 0 for success, 1 for runtime failure, and 2 for invalid input. Help and version return plain text. A running session is `waiting` without pages and `ready` with connected pages; results include `url` and `clients`. Startup returns before a page connects. Insertions return `delivery: "applied"` after page acknowledgements or `"queued"` without pages. Queued success cannot verify browser rendering or module execution.

`start` restores accepted HTML and inline modules and rebuilds styles even after the original file is deleted. Live state starts from that definition; user progress, timers, closures, and `update` commands are not persisted. `npx symbiote-agui stop demo` retains this cache, ends the session, and leaves tabs open with `Session ended.` Use `npx symbiote-agui clear demo` when the user intends to discard the saved interface. It clears live content/tools too, keeps a running session available, and also works when stopped.

For cleanup explicitly covering every session in the current storage root, use `npx symbiote-agui stop-all` to stop workers while retaining saved interfaces, or `npx symbiote-agui clear-all` to discard every saved definition and clear live content/tools while leaving workers available. These commands take no session ID and can affect interfaces from other tasks sharing that storage. Use named commands for cleanup limited to one interface. Bulk commands return `command`, `total`, and per-session `sessions` results; process each reported failure. A partial failure sets `ok: false` and exits with code 1 while other sessions are still processed. New IDs created after discovery are outside the batch.

## Internet sharing

When the user requests Internet access, run `npx symbiote-agui start demo --tunnel` for a new session or `npx symbiote-agui share demo` for a running one. AGUI manages one Cloudflare Quick Tunnel per worker, using an installed `cloudflared` or automatically downloading and verifying an official binary. No account, domain, or separate tunnel command is needed. The first connection may take up to 90 seconds after local startup. `AGUI_CLOUDFLARED_PATH` can select an executable when set before the worker starts.

`share` returns `publicUrl` for anyone to open directly, `publicUserUrl` (`?mode=user`), and `publicViewerUrl` (`?mode=viewer`). The first eligible visitor becomes the interactive user; later visitors are read-only viewers. A viewer link never claims the user role. `start --tunnel` opens the page automatically; `--no-open` returns links. Publish `publicViewerUrl` when showing the session to an audience. Share content intended for that audience.

The first eligible WebSocket connection gets the user role. Other connections are viewers while it remains connected. After disconnect, the next eligible connection or reconnection can take the role, from any browser. Existing viewers remain viewers until reconnecting; explicit viewer links never claim the user role. If sharing starts with local tabs connected, the first tab becomes the user. Viewers receive the current rendered view and subsequent changes, including user actions and CLI updates. They execute no generated modules, expose no tools, and cannot submit actions or events. Light DOM and ordinary form values are mirrored with a 1 MiB snapshot limit; password values, canvas/video frames, embedded pages, and shadow-root contents are not streamed. A disconnected user leaves the last view available; new insertions wait for the user, while clearing removes the old view.

Use the same CLI tools and events for shared sessions. `pages` reports URLs and `role: "user"` or `"viewer"`. `tools` selects the user automatically even with several viewers; viewer targets are rejected. Local-only sessions retain independent interactive tabs and require page selection when several are connected. `stop` and `stop-all` close tunnels. Clearing leaves workers and tunnels running. Quick Tunnel URLs are temporary and change after recreation; the host must remain online. Cached markup survives restart, but sharing must be requested again. `TUNNEL_FAILED` leaves the local session available; inspect the reported problem and `status` before retrying `share`. Tunnel status reports later connector exits instead of silently retrying or retaining a dead public URL.

## Markup and handlers

When writing or reviewing Symbiote components, consult the [code examples](https://raw.githubusercontent.com/symbiotejs/symbiote.js/refs/heads/main/docs/examples.md) and [common mistakes](https://raw.githubusercontent.com/symbiotejs/symbiote.js/refs/heads/main/docs/common-mistakes.md) guides.

Pass a UTF-8 HTML fragment through `--file`, limited to 1 MiB. The CLI also supports stdin. An empty fragment clears content. Each insertion replaces the generated content and resets its state and handlers. For small state changes, use `update` instead.

Use standard HTML and complete Tailwind class names, including responsive and arbitrary-value utilities. Classes are compiled from markup, including nested templates; classes added later by JavaScript are not collected. Wait separately for external images or asynchronous widgets when necessary.

Use `<agui-component>` for inline RAT markup. One direct child `<script type="application/json">` or `<script type="text/json">` initializes an object with plain state keys. Use `{{prop}}` for text and `bind="onclick: handler"` for events.

Ordinary inserted executable scripts remain inert. Opt into inline handler modules using `<script type="module" data-agui>`. Place modules outside templates. Module-scope code runs before mounting for class registration; its default export receives `(root, { emit })` after mounting and may return a cleanup function for timers or global listeners. Modules execute from Blob URLs. Use fully resolved imports such as `await import(new URL('/client/index.js', location.href).href)`; root-relative imports alone cannot resolve against Blob URLs. That entry exports `AguiComponent`, `ContextProvider`, Symbiote's APIs, and `emit`.

## Interactive example

Save this fragment as `counter.html`:

```html
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
```

After starting `demo`, insert the file. Clicking increments the count and sends a `count` event:

```sh
npx symbiote-agui insert demo --file ./counter.html
npx symbiote-agui events demo
```

To update the count, save this command as `state.json`:

```json
{ "selector": "#counter", "values": { "count": 10 } }
```

```sh
npx symbiote-agui update demo --file ./state.json
```

## State, events, and contexts

`update` reads JSON `{ "selector": "#counter", "values": { "count": 10 } }` from file or stdin. It selects components inside the content root and calls native Symbiote `set$()`. To add fields, use `"method":"add$"`; set `"rewrite":true` to overwrite existing fields too. State input has the same 1 MiB limit as markup. Functions belong in modules, not JSON state input.

Inside modules, use Symbiote's native `$`, `set$()`, `add$()`, and `sub()` APIs. Access scoped properties through the `$` proxy, such as `element.$['map/lat']` or `consumer.$['*lat']`; bulk `set$()` updates local keys. Avoid implementing replacement state APIs.

`emit(name, data)` sends a named JSON event, limited to 16 KiB. It returns `false` while disconnected and does not buffer in the page. `events` returns and clears the worker's most recent 100 events, with IDs, names, data, and timestamps; `dropped` reports overflow. Read events when awaiting user input, process the relevant events, and update the interface as the task requires. This is a temporary queue, not a durable event log.

An anonymous `<context-provider>` exposes local fields to descendants through `^prop`. A provider with `ctx="map"` also mirrors fields into a named context. Consumers use `ctx="map"` with `*prop`, or explicit `map/prop` bindings. Use one provider per named context. Provider synchronization is bidirectional, including fields added through `add$()`.

For reusable markup, include `<template id="card-template">...</template>` and a custom tag with `use-template="template#card-template"` in the same insertion. Unknown tags using `use-template` become generic components. Register custom subclasses through `YourComponent.reg('your-component')` to preserve Symbiote's WebMCP tag identity; registrations persist until page reload. No ready-made widget catalog is provided.

## Repeating items with Itemize

Generate repeating rows from data with Symbiote's `itemize` API. Put one row template inside the list container; avoid copying rows or building them with DOM loops. Use a keyed object for task IDs: Symbiote supplies `_KEY_` to each item and includes it in automatic tool names. Array items use their current index when no item key is available.

Each item has its own component state. Supply a local handler in each data descriptor, as below, or register a custom component for `item-tag` when rows need their own methods and lifecycle. A plain inline template does not inherit parent handlers: use `^handler` for a parent-owned action. For a registered item class, define its template on the class; the container's inline template supplies markup for automatically created item classes.

```html
<task-list>
  <div itemize="tasks" item-tag="task-row">
    <template>
      <label class="flex min-h-11 items-center gap-3">
        <input type="checkbox" bind="checked: checked; onchange: toggle">
        <span>{{title}}</span>
      </label>
    </template>
  </div>
</task-list>
<script type="module" data-agui>
let { AguiComponent } = await import(new URL('/client/index.js', location.href).href);
let items = {
  brief: { title: 'Review the brief', checked: false },
  preview: { title: 'Share a preview', checked: false },
};
if (!customElements.get('task-list')) {
  class TaskList extends AguiComponent {
    init$ = {
      tasks: Object.fromEntries(Object.entries(items).map(([key, item]) => [
        key, { ...item, toggle: () => this.toggleTask(key) },
      ])),
    };
    toggleTask(key) {
      let task = this.$.tasks[key];
      let checked = !task.checked;
      this.$.tasks = { ...this.$.tasks, [key]: { ...task, checked } };
      return { key, checked };
    }
  }
  TaskList.reg('task-list');
}
</script>
```

Assign a new collection to the list state to update rows. Keep complete Tailwind classes in the inserted row template so AGUI compiles them. Discover through `npx symbiote-agui tools <SESSION_ID>`; this example exposes separate `toggle_in_task-row_brief` and `toggle_in_task-row_preview` tools. Invoke an individual row tool and check its state/event result to verify targeting. Automatic handlers return Symbiote's text response and state snapshot; explicit `ToolDescriptor` actions can return structured results.

## Symbiote tools

AGUI imports Symbiote's WebMCP extension and enables `Symbiote.mcpToolMode`. Event bindings automatically expose tools, such as `increment_in_agui-component` for the counter above. The primary control route is the CLI over the existing authenticated WebSocket; it works without native browser WebMCP.

Automatic tools identify a handler and its owning component, not every DOM element. Several controls bound to the same local handler on one owner share a tool. Itemize creates separate item owners and item identities; local row handlers expose individual tools. Parent-owned `^handler` bindings retain their source item identity too. Bind interactive behavior with Symbiote `bind` syntax; raw `addEventListener` callbacks are not automatic Symbiote tools. Always use discovered names, including any collision suffixes.

Calls target one page and validate input against the discovered schema. Prefer actions that set the intended state and return meaningful results: a desk completion tool should set all checkboxes to checked and return checked/total counts so repeated calls remain safe. Discovery waits for queued rendering and bounded registration settling; an absent async tool may require discovery after its initialization finishes. Browser results are limited to 1 MiB.

Import `ToolDescriptor` from the fully resolved `/client/index.js` URL for explicit tools. Define descriptors in a subclass's `init$` before first render, with `description`, `inputSchema`, and `execute`. Use `componentDescription` for extra component context. Conditional tools need both `when` and `deps` listing every state key read by the condition. Immediately adding and syncing descriptors after mount can abort pending native registrations.

Named `PubSub` contexts can own descriptors shared by multiple consumers. Delete module-owned contexts in the module cleanup; component tools follow Symbiote's DOM lifecycle automatically. Use the exported `getActiveWebMCPTools()` and entries' `nativeActive` field for diagnostics. See the [Symbiote WebMCP guide](https://github.com/symbiotejs/symbiote.js/blob/main/docs/webmcp.md) for explicit tool examples. Define tools with Symbiote's APIs and invoke them through CLI `tools` and `call`, optional AGUI MCP, or the optional native browser consumer. Use CLI events when awaiting user input.

## Optional AGUI MCP

For harness-native tools, configure command `npx` with arguments `["symbiote-agui", "mcp"]` and reconnect the harness. It exposes `list_pages`, `list_tools`, and `call_tool` with the same page selection, discovery IDs, schema validation, and results as the CLI. Use the same absolute `AGUI_STATE_DIR` for CLI and MCP when overriding storage. Missing MCP tools do not block CLI operations.

## Optional Chrome MCP

For native browser WebMCP or browser inspection, follow the [Chrome MCP setup](https://github.com/rnd-pro/symbiote-agui/blob/main/docs/reference.md#optional-chrome-devtools-mcp). Its `list_pages` selects a Chrome page by the CLI's readable URL; `list_webmcp_tools` and `execute_webmcp_tool` discover and invoke native tools. Chrome setup and permission requirements apply only to this route. Keep the chosen control route and do not repeat an uncertain action through another route.

## Reconnection and recovery

Pages reconnect automatically. Local-only tabs and shared user pages restore the latest accepted markup with its initial values and rerun its marked modules; state commands are not replayed. Viewers reconnect to the current mirrored view. Multiple tabs receive the same insertions and state commands. Local-only tabs have independent interactions. Shared sessions mirror the user's view to read-only viewers. Stopping discards live state and events while retaining the cached interface. An empty insertion saves a blank definition; `clear` removes it.

- `SESSION_EXISTS`: check `status`; reuse a session belonging to this task or choose another ID. Do not stop an unrelated session to resolve a name collision.
- `SESSION_STOPPED`: start the intended session before inserting.
- `PAGE_UNAVAILABLE`: open the session URL directly and select its current page ID with `pages` and `tools`. Shared sessions need a user connection to operate tools; explicit viewers cannot execute them.
- `PAGE_AMBIGUOUS`: run `pages <SESSION_ID>` and pass the intended ID to `tools <SESSION_ID> --page <PAGE_ID>`.
- `TOOL_FAILED`: follow the reported error; rediscover stale tools. If the outcome is unknown, inspect the result before attempting another invocation.
- `INVALID_INPUT` or `INPUT_TOO_LARGE`: correct arguments, encoding, JSON, or input size before retrying.
- `INSERT_FAILED`: fix the reported JSON, template, stylesheet, or module error. Validation and stylesheet failures preserve prior content. Read `agui:error` events for failures while restoring queued markup. Modules may already have run or changed content; reload the session URL to restore the last accepted markup when needed.
- `UPDATE_FAILED`: check the selector and component fields. Commands and multi-tab delivery are not transactions; inspect affected pages before retrying after partial failure or timeout.
- `CACHE_ERROR`: resolve the reported storage problem. Failed insertions preserve the previous accepted cache, but browser delivery may already have changed a page. Reload to restore the last accepted interface. Startup cache failures retain the saved definition; discard it with `clear` only when intended.
- `CLEAR_FAILED`: clearing could not finish on every page. Check the reported error before retrying; the saved definition is retained unless clearing succeeds.
- `START_FAILED`, `START_TIMEOUT`, or persistent `SESSION_UNREACHABLE`: inspect the message and private `worker.log`; report a persistent blocker rather than repeatedly retrying or killing a stored PID.

Metadata and logs live under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`. Saved HTML lives in the separate `.cache/<HEX_SESSION_ID>.html` under the session storage root. Use the same absolute `AGUI_STATE_DIR` for CLI and MCP when overriding storage.
