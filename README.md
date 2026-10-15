# AGUI - Agentic Generative User Interface

> The tool that helps AI-agent to draw real-time interactive interfaces independently of exact harness implementations or vendors.

## Main Dependencies

- Symbiote.js - for RAT
- JSDA_kit - for Asset generation and live JSDA server
- Tailwind - for default styling
- Puppeteer Core - for browser control
- Node.js built-in process management - one detached worker per session

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

This contract defines the initial implementation. The commands below are not implemented yet.

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
- `insert` reads UTF-8 HTML from exactly one source: `--file <PATH>` or stdin when `--file` is absent. An interactive terminal without a file fails with usage instructions. Relative paths resolve from the caller's working directory.
- Each insertion replaces the generated content inside the page's dedicated content root. The runtime shell remains mounted; replacing content resets the removed components' local state. Success means the page applied the replacement, not that asynchronous widgets have finished loading.
- `status` checks the worker and browser connection and returns `ready`, `disconnected`, or `stopped`. A missing session is `stopped`; a live worker with a missing page or CDP connection is `disconnected`.
- `stop` is idempotent. It closes the session page, shuts down the worker and server, and removes session metadata and temporary browser data. A later `start` with the same ID creates a fresh session.
- Commands write one JSON result to stdout: `{ "ok": true, "sessionId": "demo", "state": "ready" }`, with `url` and `cdpUrl` on successful `start` and `status` while ready. Failures return `{ "ok": false, "error": { "code": "...", "message": "..." } }`. Diagnostics go to stderr. Exit codes are `0` for success, `1` for runtime failure, and `2` for invalid arguments or input.

### Browser and CDP

- By default, Puppeteer Core launches installed Chrome using its `chrome` channel, visibly, with a separate temporary profile per session. `--browser-path` selects another compatible Chrome/Chromium executable. No browser is downloaded automatically. Puppeteer Core requires an explicit [channel or executable path](https://pptr.dev/api/puppeteer.puppeteernode.launch).
- `--cdp-url` attaches to an already running browser through a loopback HTTP debugging URL or a loopback WebSocket endpoint. It is mutually exclusive with `--browser-path`. The caller must enable CDP before attaching; AGUI creates and owns only its new tab in that browser.
- AGUI uses CDP in both modes. Managed debugging endpoints and the local server bind to loopback with dynamically allocated ports. The session result includes its page URL and the browser WebSocket endpoint as `cdpUrl` so the calling agent can connect for direct DOM/context updates.
- The OS default browser is not opened separately: it may lack CDP support. If Chrome cannot be found or the supplied browser cannot connect, `start` fails with instructions to provide `--browser-path` or `--cdp-url`.
- Managed Chrome uses a non-default profile as required by [Chrome's remote debugging rules](https://developer.chrome.com/blog/remote-debugging-port). `stop` closes managed browsers; attached browsers and their pre-existing tabs remain running.
- Closing the session page or losing CDP marks the session `disconnected`. Further insertions fail until the caller stops and starts the session again; there is no automatic browser restart in the initial implementation.

### Process lifecycle

Use Node's built-in [`child_process.spawn()` with `detached` and `unref()`](https://nodejs.org/api/child_process.html#optionsdetached). Each worker owns its JSDA server, Puppeteer connection, and session page. Redirect worker output to session log files so the worker can outlive the invoking CLI. PM2 is unnecessary for this lifecycle; automatic restart and OS startup integration are outside the initial scope.

Store private session metadata and logs under `~/.symbiote-agui/sessions/<SESSION_ID>/`. Record the worker PID, page URL, browser target ID, CDP endpoint, resource ownership, and a random control token. CLI commands reach the worker through an authenticated loopback control endpoint. Keep the control token out of stdout and served page assets.

Reserve each session ID atomically before startup. Verify worker identity through the control endpoint before reusing records or stopping resources; never terminate a process based only on a stored PID. Stale records can be removed on the next `start`, while unverified processes remain untouched. A failed startup or graceful shutdown releases resources owned by that session.

Step 1 adds no dependencies. Confirm exact packages before installing them during project setup.

## Markup generation

Agent can generate regular markup using standard elements with Tailwind styling. If ready-made components are described in skill - it can use those interactive elements and widgets.

## RAT

Agent can use Symbiote RAT format for interactive component's template generation and reactive data bindings. Data context can be provided by direct DOM API interaction: `document.querySelector('my-component').$.prop = 'value'` or `document.querySelector('my-component').multiPub({prop1: 'value1', prop2: 'value2'})`. Or, by dedicated context-provider component:
```html
<context-provider>
  <map-wgt bind="lat: ^lat; lon: ^lon"></map-wgt>
</context-provider>
```
OR
```html
<context-provider ctx="map">
  <script type="text/json">
    {
      "lat": 12312321,
      "lon": 23423423
    }
  </script>
</context-provider>
<map-wgt bind="lat: *lat; lon: *lon" ctx="map"></map-wgt>
```

Component template can be set in common markdown directly:
```html
<template id="user_card_template">
  <div>{{userName}}</div>
  <div>{{userAge}}</div>
  <div>{{userRole}}</div>
</template>

<user-card
  ctx="user-ctx"
  use-template="template#user_card_template">
</user-card>
```
