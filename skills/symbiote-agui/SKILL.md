---
name: symbiote-agui
description: Create and update local interactive interfaces in Symbiote AGUI browser sessions using generated HTML, Tailwind, RAT templates, and reactive state. Use when an agent needs to display a UI for the user through AGUI.
---

# Symbiote AGUI

Use AGUI to show generated interfaces in a persistent browser tab. It requires Node.js 24 or newer, an installed Chrome/Chromium, and a checkout with `npm ci` completed. The package is private during development: use the checkout's CLI rather than downloading `symbiote-agui` with `npx`.

Set `AGUI_ROOT` to the absolute checkout path. This skill can be copied separately; its installation directory is not necessarily the project root.

## Session workflow

Choose a session ID matching `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`. Reuse that ID for updates to the same interface; use distinct IDs for independent interfaces. IDs are case-sensitive and shared across working directories for the current OS user.

```sh
node "$AGUI_ROOT/bin/symbiote-agui.js" start demo
node "$AGUI_ROOT/bin/symbiote-agui.js" insert demo --file /absolute/path/view.html
node "$AGUI_ROOT/bin/symbiote-agui.js" status demo
node "$AGUI_ROOT/bin/symbiote-agui.js" stop demo
```

`start` launches visible Chrome with an isolated profile. If needed, add `--browser-path /path/to/chrome`, or attach to an already debugging-enabled browser with `--cdp-url http://127.0.0.1:9222` or a loopback `ws://` endpoint. These options are mutually exclusive. An attached session owns only its new tab.

Session commands return one JSON object on stdout. Check `ok` and `state`; successful ready results include `url` and `cdpUrl`. Errors have `{ "ok": false, "error": { "code": "...", "message": "..." } }`. Exit codes are 0 for success, 1 for runtime failure, and 2 for invalid input. Logs go to stderr or the worker log. Help and version return plain text.

Keep the session open while the user interacts. Stop it when the user is finished or requests cleanup. `stop` is idempotent; it closes managed Chrome, or only the AGUI tab in an attached browser.

## Markup and templates

Pass a UTF-8 HTML fragment through `--file` or stdin. Input is limited to 1 MiB. Each successful `insert` replaces all generated content and resets its components' state and handlers. Empty input clears it. For small state changes, update the existing components through CDP instead of reinserting markup.

Use standard HTML controls and complete Tailwind class names such as `p-4` and `md:grid-cols-2`. Classes are compiled locally from inserted markup, including templates. Class names added later by JavaScript are not collected. Insertion success acknowledges DOM replacement and stylesheet loading; wait separately for asynchronous content when needed.

Use `<agui-component>` for inline reactive markup. Initialize it with one direct child `<script type="application/json">` or `<script type="text/json">` containing an object with plain state keys. Use `{{property}}` for text and `bind="onclick: handler"` for events. Executable scripts inserted as markup remain inert; attach functions through CDP or registered component classes.

For reusable markup, include `<template id="card-template">...</template>` and a custom element with `use-template="template#card-template"`. Unknown custom tags using `use-template` are registered as generic components. Include referenced templates in the same insertion. For custom behavior, import `AguiComponent` from `/client/index.js` inside the session page and register a subclass. No ready-made widget catalog is provided.

## CDP and state updates

Connect with an available CDP tool, or use the checkout's `puppeteer-core` dependency. With Puppeteer, pass the returned `cdpUrl` as `browserWSEndpoint`, then select the page matching the returned `url`; do not assume the first tab is the session. Evaluate component updates inside that page. Disconnect the temporary client when done; `browser.close()` would close the browser used by the session.

Use Symbiote's existing APIs:

- `element.$.prop = value` updates one existing field.
- `element.set$({ prop1: value1, prop2: value2 })` updates existing local fields. Unchanged primitive values skip notification unless the second argument is `true`.
- `element.add$({ newProp: value })` adds fields, keeping existing values. Pass `true` as the second argument to overwrite existing fields too.
- `element.sub('prop', handler)` observes a field and immediately calls the handler with its value; pass `false` as the third argument to skip that initial call.

An anonymous `<context-provider>` exposes its local fields to descendants through `^prop`. A provider with `ctx="map"` also mirrors its local fields into the named context, including fields added through `add$()`. Consumers use `ctx="map"` with `*prop`, or explicit `map/prop` bindings. Keep one provider per named context. JSON initialization uses plain local keys; context prefixes belong in bindings or JavaScript access.

Update scoped fields through the `$` proxy, such as `consumer.$['*lat'] = 77` or `element.$['map/lat'] = 77`. Named provider synchronization works in both directions. Replacement resets provider-owned contexts and releases removed components' subscriptions.

## Small interactive example

Insert a counter using stdin:

```sh
node "$AGUI_ROOT/bin/symbiote-agui.js" insert demo <<'HTML'
<agui-component id="counter" class="block p-8">
  <script type="application/json">{"count":0,"increment":null}</script>
  <button type="button" class="rounded bg-blue-600 p-4 text-white" bind="onclick: increment">
    Count: {{count}}
  </button>
</agui-component>
HTML
```

Run this JavaScript in the session page through CDP or its browser console:

```js
let counter = document.querySelector('#counter');
counter.set$({
  increment: () => { counter.$.count += 1; },
});
```

Clicking the button increments the visible count. Update it without replacing the interface with `counter.set$({ count: 10 })`. Reinserted markup needs its handlers attached again.

## Error recovery

- `SESSION_EXISTS`: check `status` and reuse the existing session when it belongs to this task; otherwise choose another ID. Do not stop it merely to resolve a name collision.
- `SESSION_STOPPED`: start the intended session, then insert the markup.
- `SESSION_DISCONNECTED` or a `disconnected` status: stop and start the session, then reinsert markup and reattach handlers. The runtime does not reconnect automatically.
- `START_FAILED` or `START_TIMEOUT`: read the message, correct the browser path or CDP endpoint, then retry. Do not keep retrying the same configuration.
- `INVALID_INPUT` or `INPUT_TOO_LARGE`: correct the arguments, encoding, or fragment size before retrying.
- `INSERT_FAILED`: inspect the message and fix invalid JSON, missing templates, duplicate named providers, or stylesheet failures. Validation and stylesheet failures preserve previous content; inspect the page before retrying after other rendering errors.
- `SESSION_UNREACHABLE` or `STOP_FAILED`: check status once more after startup or shutdown has had time to finish. If it persists, inspect `worker.log` under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`, or the configured `AGUI_STATE_DIR`. Report the blocker rather than looping or killing a PID from stored metadata.

After an uncertain insertion outcome, inspect the page before sending the replacement again: the client can lose its response after the page has applied it. Use the same absolute `AGUI_STATE_DIR` for all commands when overriding storage. Treat session metadata and CDP endpoints as private local connection details.
