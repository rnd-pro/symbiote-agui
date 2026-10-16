---
name: symbiote-agui
description: Create, restore, and operate local interactive interfaces with Symbiote AGUI. Use for generated HTML, Tailwind styling, RAT templates, component state updates, and user interaction through the AGUI CLI and MCP tools.
---

# Symbiote AGUI

Use AGUI to show an interface in the user's normal browser, operate its Symbiote tools, and receive user interaction events. It requires Node.js 24 or newer. Run CLI commands through `npx symbiote-agui`; use AGUI MCP for tool discovery and invocation.

## One-time setup

Creating pages requires shell access to the CLI. For agent tool invocation, run `npx symbiote-agui --help` once to finish any npm installation prompt, configure an MCP server in the harness with command `npx` and arguments `symbiote-agui`, `mcp`, then reconnect the harness. Confirm that this server exposes `list_pages`, `list_tools`, and `call_tool`. Starting a process through a shell alone does not attach MCP tools to the conversation. Use the same absolute `AGUI_STATE_DIR` for CLI and MCP when overriding storage.

AGUI MCP works over the existing authenticated WebSocket in ordinary browsers. Native WebMCP and remote debugging are optional. If a task needs tool invocation and the AGUI MCP tools are absent, report the missing harness connection. Avoid ad hoc browser scripts or browser API emulation.

## Routine workflow

Choose a case-sensitive session ID matching `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`. Reuse it for the same interface; IDs are shared across working directories for the current OS user.

1. Run `npx symbiote-agui start demo`. Check `ok` and `restored`. If `SESSION_EXISTS` is returned, use `npx symbiote-agui status demo` once and reuse a session belonging to this task, or choose another ID.
2. Reuse an owned running session or a `restored: true` interface without regenerating or reinserting it. For a new or deliberately changed definition, use `npx symbiote-agui insert demo --file /absolute/path/view.html` or stdin. Use `update` for small state changes.
3. Call AGUI MCP's `list_tools({ sessionId: "demo" })`. It selects a single connected page automatically. With several pages, use `list_pages({ sessionId: "demo" })` and pass the intended `pageId` to `list_tools`. Keep the returned `pageId`, `discoveryId`, tool names, and schemas.
4. Call `call_tool({ sessionId, pageId, discoveryId, name, input })` with the exact discovered name and schema-compatible arguments. Check MCP's `isError` flag and use the returned action result as confirmation. Reuse the selected page and discovery IDs for further calls while they remain current.
5. When awaiting user interaction, read `npx symbiote-agui events demo` and process the relevant events. It returns immediately and clears the queue; an empty batch means no new input. Check again when interaction is expected, without tight polling. Keep the session available while the user interacts. Stop it when the user is finished or requests cleanup.

Use tool results or CLI events when they answer the task; avoid repeated status checks, DOM inspection, screenshots, or unrelated commands. After replacement or catalog changes, rediscover tools. After reload, reconnection, or worker restart, select the current page again. Do not retry an invocation automatically when its outcome is unknown.

## Session behavior

`start` opens and authorizes a regular page in the OS default browser. Its readable `url` contains the session ID, for example `http://127.0.0.1:PORT/demo/`; the port can change on restart. With `--no-open`, open the returned private `authorizationUrl` manually. A failed opener returns `opened: false`, a warning, and the authorization link. Opening the link removes its token fragment from the address bar and establishes an HttpOnly cookie. Another browser/profile or cleared cookies require `npx symbiote-agui status demo --authorize` and opening its `authorizationUrl`.

Session commands return one JSON object on stdout. Check `ok`; errors include `error.code` and `error.message`. Exit codes are 0 for success, 1 for runtime failure, and 2 for invalid input. Help and version return plain text. A running session is `waiting` without pages and `ready` with connected pages; results include `url` and `clients`. Startup returns before a page connects. Insertions return `delivery: "applied"` after page acknowledgements or `"queued"` without pages. Queued success cannot verify browser rendering or module execution.

`start` restores accepted HTML and inline modules and rebuilds styles even after the original file is deleted. Live state starts from that definition; user progress, timers, closures, and `update` commands are not persisted. `npx symbiote-agui stop demo` retains this cache, ends the session, and leaves tabs open with `Session ended.` Use `npx symbiote-agui clear demo` when the user intends to discard the saved interface. It clears live content/tools too, keeps a running session available, and also works when stopped.

## Markup and handlers

Pass a UTF-8 HTML fragment through `--file` or stdin, limited to 1 MiB. An empty fragment clears content. Each insertion replaces the generated content and resets its state and handlers. For small state changes, use `update` instead.

Use standard HTML and complete Tailwind class names, including responsive and arbitrary-value utilities. Classes are compiled from markup, including nested templates; classes added later by JavaScript are not collected. Wait separately for external images or asynchronous widgets when necessary.

Use `<agui-component>` for inline RAT markup. One direct child `<script type="application/json">` or `<script type="text/json">` initializes an object with plain state keys. Use `{{prop}}` for text and `bind="onclick: handler"` for events.

Ordinary inserted executable scripts remain inert. Opt into inline handler modules using `<script type="module" data-agui>`. Place modules outside templates. Module-scope code runs before mounting for class registration; its default export receives `(root, { emit })` after mounting and may return a cleanup function for timers or global listeners. Modules execute from Blob URLs. Use fully resolved imports such as `await import(new URL('/client/index.js', location.href).href)`; root-relative imports alone cannot resolve against Blob URLs. That entry exports `AguiComponent`, `ContextProvider`, Symbiote's APIs, and `emit`.

## Interactive example

After starting `demo`, insert:

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

Clicking increments the count and sends a `count` event. Retrieve events or update the component through the CLI:

```sh
npx symbiote-agui events demo
printf '%s\n' '{"selector":"#counter","values":{"count":10}}' | npx symbiote-agui update demo
```

## State, events, and contexts

`update` reads JSON `{ "selector": "#counter", "values": { "count": 10 } }` from file or stdin. It selects components inside the content root and calls native Symbiote `set$()`. To add fields, use `"method":"add$"`; set `"rewrite":true` to overwrite existing fields too. State input has the same 1 MiB limit as markup. Functions belong in modules, not JSON state input.

Inside modules, use Symbiote's native `$`, `set$()`, `add$()`, and `sub()` APIs. Access scoped properties through the `$` proxy, such as `element.$['map/lat']` or `consumer.$['*lat']`; bulk `set$()` updates local keys. Avoid implementing replacement state APIs.

`emit(name, data)` sends a named JSON event, limited to 16 KiB. It returns `false` while disconnected and does not buffer in the page. `events` returns and clears the worker's most recent 100 events, with IDs, names, data, and timestamps; `dropped` reports overflow. Read events when awaiting user input, process the relevant events, and update the interface as the task requires. This is a temporary queue, not a durable event log.

An anonymous `<context-provider>` exposes local fields to descendants through `^prop`. A provider with `ctx="map"` also mirrors fields into a named context. Consumers use `ctx="map"` with `*prop`, or explicit `map/prop` bindings. Use one provider per named context. Provider synchronization is bidirectional, including fields added through `add$()`.

For reusable markup, include `<template id="card-template">...</template>` and a custom tag with `use-template="template#card-template"` in the same insertion. Unknown tags using `use-template` become generic components. Register custom subclasses through `YourComponent.reg('your-component')` to preserve Symbiote's WebMCP tag identity; registrations persist until page reload. No ready-made widget catalog is provided.

## Symbiote tools

AGUI imports Symbiote's WebMCP extension and enables `Symbiote.mcpToolMode`. Event bindings automatically expose tools, such as `increment_in_agui-component` for the counter above. The primary control route is AGUI MCP over the existing authenticated WebSocket; it works without native browser WebMCP.

Calls target one page and validate input against the discovered schema. Prefer actions that set the intended state and return meaningful results: a desk completion tool should set all checkboxes to checked and return checked/total counts so repeated calls remain safe. Discovery waits for queued rendering and bounded registration settling; an absent async tool may require discovery after its initialization finishes. Browser results are limited to 1 MiB.

Import `ToolDescriptor` from the fully resolved `/client/index.js` URL for explicit tools. Define descriptors in a subclass's `init$` before first render, with `description`, `inputSchema`, and `execute`. Use `componentDescription` for extra component context. Conditional tools need both `when` and `deps` listing every state key read by the condition. Immediately adding and syncing descriptors after mount can abort pending native registrations.

Named `PubSub` contexts can own descriptors shared by multiple consumers. Delete module-owned contexts in the module cleanup; component tools follow Symbiote's DOM lifecycle automatically. Use the exported `getActiveWebMCPTools()` and entries' `nativeActive` field for diagnostics. See the [project README](https://github.com/rnd-pro/symbiote-agui#webmcp) for a complete explicit tool example. Define tools with Symbiote's APIs and invoke them through AGUI MCP or the optional native browser consumer. Use CLI events when awaiting user input.

## Optional Chrome MCP

For native browser WebMCP or browser inspection, follow the [Chrome MCP setup](https://github.com/rnd-pro/symbiote-agui#optional-connect-chrome-devtools-mcp). Its `list_pages` selects a Chrome page by the CLI's readable URL; `list_webmcp_tools` and `execute_webmcp_tool` discover and invoke native tools. Chrome setup and permission requirements apply only to this route. Keep the chosen control route and do not repeat an uncertain action through another route.

## Reconnection and recovery

Pages reconnect automatically and restore the latest accepted markup. Reload or reconnect resets live state to the markup's initial values and reruns its marked modules; state commands are not replayed. Multiple tabs receive the same insertions and state commands. Local interactions are independent until the agent sends a shared update. Stopping discards live state and events while retaining the cached interface. An empty insertion saves a blank definition; `clear` removes it.

- `SESSION_EXISTS`: check `status`; reuse a session belonging to this task or choose another ID. Do not stop an unrelated session to resolve a name collision.
- `SESSION_STOPPED`: start the intended session before inserting.
- `PAGE_UNAVAILABLE`: open the session URL in its authorized browser and select its current MCP page ID. If authorization is required, use `status <SESSION_ID> --authorize` and open `authorizationUrl`.
- `PAGE_AMBIGUOUS`: use AGUI MCP's `list_pages` and pass the intended `pageId` to `list_tools`.
- `TOOL_FAILED`: follow the reported error; rediscover stale tools. If the outcome is unknown, inspect the result before attempting another invocation.
- `INVALID_INPUT` or `INPUT_TOO_LARGE`: correct arguments, encoding, JSON, or input size before retrying.
- `INSERT_FAILED`: fix the reported JSON, template, stylesheet, or module error. Validation and stylesheet failures preserve prior content. Read `agui:error` events for failures while restoring queued markup. Modules may already have run or changed content; reload the session URL to restore the last accepted markup when needed.
- `UPDATE_FAILED`: check the selector and component fields. Commands and multi-tab delivery are not transactions; inspect affected pages before retrying after partial failure or timeout.
- `CACHE_ERROR`: resolve the reported storage problem. Failed insertions preserve the previous accepted cache, but browser delivery may already have changed a page. Reload to restore the last accepted interface. Startup cache failures retain the saved definition; discard it with `clear` only when intended.
- `CLEAR_FAILED`: clearing could not finish on every page. Check the reported error before retrying; the saved definition is retained unless clearing succeeds.
- `START_FAILED`, `START_TIMEOUT`, or persistent `SESSION_UNREACHABLE`: inspect the message and private `worker.log`; report a persistent blocker rather than repeatedly retrying or killing a stored PID.

Metadata and logs live under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`. Saved HTML lives in the separate `.cache/<HEX_SESSION_ID>.html` under the session storage root. Use the same absolute `AGUI_STATE_DIR` for CLI and MCP when overriding storage. Keep authorization links and tokens private.
