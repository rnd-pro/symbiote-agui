# AGUI - Agentic Generative User Interface

> The tool that helps AI-agent to draw real-time interactive interfaces independently of exact harness implementations or vendors.

## Main Dependencies

Runtime integrations:

- Symbiote.js - for RAT templates and reactive contexts
- JSDA_kit - for Asset generation and live JSDA server
- Tailwind - for locally generated default styling
- Puppeteer Core - for browser control
- Node.js built-in process management - one detached worker per session

## Development

Use Node.js 24 or newer and an installed Chrome/Chromium browser. Install dependencies and check the project:

```sh
npm ci
npm start -- --help
npm start -- --version
npm run types
```

`bin/symbiote-agui.js` runs JavaScript ESM directly, with no build step. Help, version, `start`, `insert`, `status`, and `stop` are available. The package is private during development; use `node bin/symbiote-agui.js` in place of `npx symbiote-agui` in the examples below.

Keep CLI parsing and output in `src/cli`, session identity and lifecycle in [src/sessions](./src/sessions/README.md), browser control in `src/browser`, HTTP servers in `src/server`, and browser components in [src/page/client](./src/page/client/README.md). Shared errors and dictionaries live in `src/shared`. Define shared data shapes in `types/*.d.ts` and reference them from JSDoc using `.js` import paths. `npm run types` uses `checkJs`, `strict`, and `noEmit`; DOM declarations are included for Puppeteer's Node API, and browser modules are also checked separately without Node globals. It generates no runtime files.

JSDA-Kit is pinned to 1.6.3 because the server adapter passes Node's `{ host, port }` listen options through its `port` setting. This binds directly to loopback on a free port. The public page server exposes `/`, `/styles.css.js`, and the bundled browser entry `/client/index.js`; the authenticated control API uses a separate port. Tailwind compiles styles in the worker, and JSDA serves CSS and bundles the browser modules on demand. Node runtime code runs directly. The type-checking configuration maps `@tailwindcss/node` to the consumed compiler API in `types/tailwindcss-node.d.ts` because version 4.3.3 references unpublished declaration files.

Add Node tests under `tests/node` and Puppeteer tests under `tests/browser` when meaningful coverage is needed. Runtime dependencies will be confirmed before their integrations are added.

### Session checks

For a manual check with visible Chrome:

1. Run `node bin/symbiote-agui.js start demo` and confirm the waiting page opens. Use `--browser-path <PATH>` if needed.
2. Run `node bin/symbiote-agui.js status demo` and confirm `ready`. Starting `demo` again should report `SESSION_EXISTS`.
3. Pipe the sample below into `insert demo`, then insert a different HTML fragment from a file with `node bin/symbiote-agui.js insert demo --file ./view.html`. Confirm the previous content is replaced and the browser tab stays open.
4. Start a second ID and insert different content. Confirm updates affect only the chosen session, then stop `demo`. Only the first session's browser should close.
5. Close the second session's page manually, check for `disconnected`, then stop that ID. Repeating `stop` should return `stopped`.

```sh
printf '%s\n' '<section class="p-8"><h1 class="text-2xl font-bold">Hello from AGUI</h1><details class="mt-4"><summary class="cursor-pointer text-blue-600">Open</summary><p>Native HTML interaction works.</p></details></section>' | node bin/symbiote-agui.js insert demo
```

Focused lifecycle checks are available with `npm run test:node`. To run the Puppeteer checks with a separate headless Chrome, set `AGUI_TEST_BROWSER_PATH` to its executable and run `npm run test:browser`. The browser files run sequentially with bounded browser startup times, skip when that path is absent, and use temporary profiles and state directories.

## How it works

1. AI-Agent/harness reads skill
2. Skill describes AGUI workflow and possibilities
3. Skill describes `npx symbiote-agui start <SESSION_ID>` command that:
   1. Starts Node.js process
   2. Launches Chrome or connects to an explicitly supplied CDP endpoint
   3. Opens a session tab in the controlled browser
   4. Opens a default page ready for generative markup input
   5. Waits for Agentic markup generation passed to process
   6. Receives generated markup via `npx symbiote-agui insert <SESSION_ID> --file <PATH>` or stdin
4. User can interact with UI in browser

## Runtime contract

This contract defines the initial implementation. Session lifecycle, markup delivery, and Symbiote interactivity are implemented.

### Package and commands

Use `symbiote-agui` for both the npm package and executable. On 2026-10-15, the npm registry returned an existing package for [`agui`](https://registry.npmjs.org/agui) and no package for [`symbiote-agui`](https://registry.npmjs.org/symbiote-agui). Availability must be checked again before publishing; this check does not reserve the name.

```sh
npx symbiote-agui start demo
npx symbiote-agui start demo --browser-path /path/to/chrome
npx symbiote-agui start demo --cdp-url http://127.0.0.1:9222
npx symbiote-agui insert demo --file ./view.html
npx symbiote-agui insert demo < ./view.html
npx symbiote-agui status demo
npx symbiote-agui stop demo
```

- Session IDs are caller-supplied, case-sensitive names matching `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`. They identify UI sessions, independently of operating system process IDs, and are unique for the current OS user across working directories.
- `start` returns after the server, CDP connection, and session page are ready. Starting an existing live ID fails without changing that session. Startup has a 30-second timeout and rolls back resources created by the failed attempt.
- `insert` reads UTF-8 HTML from exactly one source: `--file <PATH>` or stdin when `--file` is absent. An interactive terminal without a file fails with usage instructions. Relative paths resolve from the caller's working directory. Input is limited to 1 MiB; empty input clears the content root.
- Each insertion replaces the generated content inside the page's dedicated content root. The runtime shell remains mounted; replacing content resets the removed components' local state. Success means the page applied the replacement, not that asynchronous widgets have finished loading.
- `status` checks the worker and browser connection and returns `ready`, `disconnected`, or `stopped`. A missing session is `stopped`; a live worker with a missing page or CDP connection is `disconnected`.
- `stop` is idempotent. It closes the session page, shuts down the worker and server, and removes session metadata and temporary browser data. A later `start` with the same ID creates a fresh session.
- Commands write one JSON result to stdout: `{ "ok": true, "sessionId": "demo", "state": "ready" }`, with `url` and `cdpUrl` on successful `start`, `insert`, and `status` while ready. Failures return `{ "ok": false, "error": { "code": "...", "message": "..." } }`. Diagnostics go to stderr. Exit codes are `0` for success, `1` for runtime failure, and `2` for invalid arguments or input.

### Browser and CDP

- By default, Puppeteer Core launches installed Chrome using its `chrome` channel, visibly, with a separate temporary profile per session. `--browser-path` selects another compatible Chrome/Chromium executable. No browser is downloaded automatically. Puppeteer Core requires an explicit [channel or executable path](https://pptr.dev/api/puppeteer.puppeteernode.launch).
- `--cdp-url` attaches to an already running browser through a loopback HTTP debugging URL or a loopback WebSocket endpoint. It is mutually exclusive with `--browser-path`. The caller must enable CDP before attaching; AGUI creates and owns only its new tab in that browser.
- AGUI uses CDP in both modes. Managed debugging endpoints and the local server bind to loopback with dynamically allocated ports. The session result includes its page URL and the browser WebSocket endpoint as `cdpUrl` so the calling agent can connect for direct DOM/context updates.
- The OS default browser is not opened separately: it may lack CDP support. If Chrome cannot be found or the supplied browser cannot connect, `start` fails with instructions to provide `--browser-path` or `--cdp-url`.
- Managed Chrome uses a non-default profile as required by [Chrome's remote debugging rules](https://developer.chrome.com/blog/remote-debugging-port). `stop` closes managed browsers; attached browsers and their pre-existing tabs remain running.
- Closing the session page or losing CDP marks the session `disconnected`. Further insertions fail until the caller stops and starts the session again; there is no automatic browser restart in the initial implementation.

### Process lifecycle

Use Node's built-in [`child_process.spawn()` with `detached` and `unref()`](https://nodejs.org/api/child_process.html#optionsdetached). Each worker owns its JSDA server, Puppeteer connection, and session page. Redirect worker output to session log files so the worker can outlive the invoking CLI. PM2 is unnecessary for this lifecycle; automatic restart and OS startup integration are outside the initial scope.

Store private session metadata and logs under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`. Hex encoding preserves case-sensitive session IDs on case-insensitive filesystems. Set `AGUI_STATE_DIR` to override the sessions root; use an absolute path when calling from different working directories. Record the worker PID, page URL, browser target ID, CDP endpoint, resource ownership, and a random control token. CLI commands reach the worker through an authenticated loopback control endpoint. Keep the control token out of stdout and served page assets.

Reserve each session ID atomically before startup. Verify worker identity through the control endpoint before reusing records or stopping resources; never terminate a process based only on a stored PID. Stale records can be removed on the next `start`, while unverified processes remain untouched. A failed startup or graceful shutdown releases resources owned by that session.

An unresponsive live worker or a session still starting returns `SESSION_UNREACHABLE` to `status` or `stop`; retry after startup completes or inspect its private `worker.log`. The 30-second startup limit allows additional time for cleanup. Abruptly force-killing a worker can leave its browser running; close that browser manually. Stale-session recovery does not kill processes from stored PIDs.

## Markup generation

Agent can generate regular markup using standard elements with Tailwind styling. If ready-made components are described in skill - it can use those interactive elements and widgets.

Insert HTML fragments such as `<section>...</section>`. Each update replaces the content root's children and resets their local state while keeping the shell and tab mounted. Updates are serialized per session. Reloading the page restores the initial waiting view.

Tailwind classes are collected from the fragment, including nested `<template>` contents, and compiled locally. Use complete class names such as `p-4`, `md:grid-cols-2`, and `w-[123px]`; new class names computed later by scripts are not detected. Compiled utilities accumulate for the lifetime of the session. See [Tailwind class detection](https://tailwindcss.com/docs/detecting-classes-in-source-files).

The worker publishes CSS through JSDA and waits for the replacement stylesheet to load before changing the content. A rendering or stylesheet failure leaves the previous content in place and returns `INSERT_FAILED`; stopped or disconnected sessions return the corresponding `SESSION_STOPPED` or `SESSION_DISCONNECTED` error. Success acknowledges DOM replacement and stylesheet loading, without waiting for external images or asynchronous widgets.

Native HTML controls and Symbiote bindings work after insertion. Inserted executable `<script>` elements remain inert; direct JSON data scripts initialize AGUI components. Provide event handlers through direct DOM/CDP updates or registered component classes.

## RAT

Use `<agui-component>` for inline RAT markup. Custom tags with `use-template`, such as `<user-card>`, are automatically registered as generic Symbiote components when the tag is not already defined. Templates are resolved from the current insertion, so a later update can reuse the same tag with a different template. For custom widget behavior, register a class through CDP using `AguiComponent` exported from `/client/index.js`.

Initialize state with one direct child `<script type="text/json">` or `<script type="application/json">` containing an object with plain state keys. Update existing fields with `element.$.prop = value` or Symbiote's `element.set$({ prop1: value1, prop2: value2 })`. Use `element.add$({ newProp: value })` to add fields, or pass `true` as its second argument to also overwrite existing fields. These operations run in the session page through CDP or its browser console.

An anonymous provider exposes local state to descendants through `^` bindings:

```html
<context-provider id="location-data">
  <script type="application/json">{"lat": 10, "lon": 20}</script>
  <agui-component>
    <output>{{^lat}}, {{^lon}}</output>
  </agui-component>
</context-provider>
```

A named provider shares state with sibling components through `ctx` and `*` bindings, or explicit `map/lat` namespace bindings:

```html
<context-provider id="map-data" ctx="map">
  <script type="text/json">
    {
      "lat": 12312321,
      "lon": 23423423
    }
  </script>
</context-provider>
<agui-component ctx="map">
  <output>{{*lat}}, {{*lon}}</output>
</agui-component>
```

Provider updates such as `document.querySelector('#map-data').set$({lat: 55, lon: 66})` refresh consumers. Fields added with `add$()` are also shared. Shared updates such as `document.querySelector('agui-component[ctx="map"]').$['*lat'] = 77` also refresh the provider's local state. Use one provider per named context. Replacement resets provider-owned contexts, including providers rendered inside templates; removed components release their subscriptions.

Define reusable component templates directly in the inserted HTML:

```html
<template id="user_card_template">
  <div>{{userName}}</div>
  <div>{{userAge}}</div>
  <div>{{userRole}}</div>
</template>

<user-card
  ctx="user-ctx"
  use-template="template#user_card_template">
  <script type="application/json">
    {"userName": "Alex", "userAge": 42, "userRole": "Developer"}
  </script>
</user-card>
```

For a manual interaction check, insert this fragment:

```html
<agui-component id="counter" class="block p-8">
  <script type="application/json">{"count": 0, "increment": null}</script>
  <button class="rounded bg-blue-600 p-4 text-white" bind="onclick: increment">
    Count: {{count}}
  </button>
</agui-component>
```

Attach its handler in the session page's browser console or through CDP, then click the button:

```js
let counter = document.querySelector('#counter');
counter.set$({
  increment: () => { counter.$.count += 1; },
});
```

Insert the fragment again and confirm the count resets and the new button needs its handler attached again. Invalid JSON data or a missing template returns `INSERT_FAILED` while preserving the existing content.
