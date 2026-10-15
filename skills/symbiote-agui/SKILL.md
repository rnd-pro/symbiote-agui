---
name: symbiote-agui
description: Create and update local interactive interfaces in regular browser pages through Symbiote AGUI sessions. Use for generated HTML, Tailwind styling, RAT templates, reactive state updates, and retrieving user interaction events through the AGUI CLI.
---

# Symbiote AGUI

Use AGUI to show an interface in the user's normal browser and receive its interaction events. It requires Node.js 24 or newer and a checkout with `npm ci` completed. Set `AGUI_ROOT` to the absolute checkout path; this skill's installation directory may be elsewhere. The package is private during development, so use the checkout's CLI rather than downloading it with `npx`.

## Session workflow

Choose an ID matching `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`. Reuse it for the same interface, and choose distinct IDs for independent interfaces. IDs are case-sensitive and shared across working directories for the current OS user.

```sh
node "$AGUI_ROOT/bin/symbiote-agui.js" start demo
node "$AGUI_ROOT/bin/symbiote-agui.js" insert demo --file /absolute/path/view.html
node "$AGUI_ROOT/bin/symbiote-agui.js" update demo --file /absolute/path/state.json
node "$AGUI_ROOT/bin/symbiote-agui.js" events demo
node "$AGUI_ROOT/bin/symbiote-agui.js" status demo
node "$AGUI_ROOT/bin/symbiote-agui.js" stop demo
```

`start` opens a regular page in the OS default browser. Use `--no-open` to return the URL without opening a tab. Keep the entire returned URL, including its token fragment. A failed browser opener returns `opened: false` and a warning while leaving the server available; give the user the URL to open manually. Chrome, CDP, debugging flags, and browser automation tools are unnecessary for the runtime.

Session commands return one JSON object on stdout. Check `ok`; errors include `error.code` and `error.message`. Exit codes are 0 for success, 1 for runtime failure, and 2 for invalid input. Help and version return plain text.

A running session is `waiting` without pages and `ready` with connected pages; results include `url` and `clients`. `start` returns as soon as the worker is listening. Insertion without pages returns `delivery: "queued"`; connected pages acknowledge application with `delivery: "applied"`. Queued success cannot verify browser-specific rendering or module execution.

Keep the session available while the user interacts. Stop it when the user is finished or requests cleanup. `stop` is idempotent and ends the session without closing browser tabs. Open pages display `Session ended.`

## Markup and handlers

Pass a UTF-8 HTML fragment through `--file` or stdin, limited to 1 MiB. An empty fragment clears content. Each insertion replaces the generated content and resets its state and handlers. For small state changes, use `update` instead.

Use standard HTML and complete Tailwind class names, including responsive and arbitrary-value utilities. Classes are compiled from markup, including nested templates; classes added later by JavaScript are not collected. Wait separately for external images or asynchronous widgets when necessary.

Use `<agui-component>` for inline RAT markup. One direct child `<script type="application/json">` or `<script type="text/json">` initializes an object with plain state keys. Use `{{prop}}` for text and `bind="onclick: handler"` for events.

Ordinary inserted executable scripts remain inert. Opt into inline handler modules using `<script type="module" data-agui>`. Place modules outside templates. Module-scope code runs before mounting for class registration; its default export receives `(root, { emit })` after mounting and may return a cleanup function for timers or global listeners. Modules execute from Blob URLs. Use fully resolved imports such as `await import(new URL('/client/index.js', location.href).href)`; root-relative imports alone cannot resolve against Blob URLs. That entry exports `AguiComponent`, `ContextProvider`, Symbiote's APIs, and `emit`.

## Interactive example

After starting `demo`, insert:

```sh
node "$AGUI_ROOT/bin/symbiote-agui.js" insert demo <<'HTML'
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
node "$AGUI_ROOT/bin/symbiote-agui.js" events demo
printf '%s\n' '{"selector":"#counter","values":{"count":10}}' | node "$AGUI_ROOT/bin/symbiote-agui.js" update demo
```

## State, events, and contexts

`update` reads JSON `{ "selector": "#counter", "values": { "count": 10 } }` from file or stdin. It selects components inside the content root and calls native Symbiote `set$()`. To add fields, use `"method":"add$"`; set `"rewrite":true` to overwrite existing fields too. State input has the same 1 MiB limit as markup. Functions belong in modules, not JSON state input.

Inside modules, use Symbiote's native `$`, `set$()`, `add$()`, and `sub()` APIs. Access scoped properties through the `$` proxy, such as `element.$['map/lat']` or `consumer.$['*lat']`; bulk `set$()` updates local keys. Avoid implementing replacement state APIs.

`emit(name, data)` sends a named JSON event, limited to 16 KiB. It returns `false` while disconnected and does not buffer in the page. `events` returns and clears the worker's most recent 100 events, with IDs, names, data, and timestamps; `dropped` reports overflow. Read events when awaiting user input, process the relevant events, and update the interface as the task requires. This is a temporary queue, not a durable event log.

An anonymous `<context-provider>` exposes local fields to descendants through `^prop`. A provider with `ctx="map"` also mirrors fields into a named context. Consumers use `ctx="map"` with `*prop`, or explicit `map/prop` bindings. Use one provider per named context. Provider synchronization is bidirectional, including fields added through `add$()`.

For reusable markup, include `<template id="card-template">...</template>` and a custom tag with `use-template="template#card-template"` in the same insertion. Unknown tags using `use-template` become generic components. Custom behavior can register a subclass of `AguiComponent`; registrations persist until page reload. No ready-made widget catalog is provided.

## Reconnection and recovery

Pages reconnect automatically and restore the latest accepted markup. Reload or reconnect resets live state to the markup's initial values and reruns its marked modules; state commands are not replayed. Multiple tabs receive the same insertions and state commands. Local interactions are independent until the agent sends a shared update. Stopping discards retained markup and events.

- `SESSION_EXISTS`: check `status`; reuse a session belonging to this task or choose another ID. Do not stop an unrelated session to resolve a name collision.
- `SESSION_STOPPED`: start the intended session before inserting.
- `PAGE_UNAVAILABLE`: open the full session URL before sending state updates.
- `INVALID_INPUT` or `INPUT_TOO_LARGE`: correct arguments, encoding, JSON, or input size before retrying.
- `INSERT_FAILED`: fix the reported JSON, template, stylesheet, or module error. Validation and stylesheet failures preserve prior content. Read `agui:error` events for failures while restoring queued markup. Modules may already have run or changed content; reload the session URL to restore the last accepted markup when needed.
- `UPDATE_FAILED`: check the selector and component fields. Commands and multi-tab delivery are not transactions; inspect affected pages before retrying after partial failure or timeout.
- `START_FAILED`, `START_TIMEOUT`, or persistent `SESSION_UNREACHABLE`: inspect the message and private `worker.log`; report a persistent blocker rather than repeatedly retrying or killing a stored PID.

Metadata and logs live under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`. Use the same absolute `AGUI_STATE_DIR` for all commands when overriding storage. Treat the full session URL and tokens as private local connection details.
