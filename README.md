# AGUI - Agentic Generative User Interface

> Create interactive browser interfaces from an AI agent.

AGUI lets AI agents create and update interactive interfaces in regular browser pages. Use the CLI to deliver markup, update component state, and retrieve user interaction events.

## Usage with npx

Use Node.js 24 or newer. Run from any directory:

```sh
npx symbiote-agui start demo
npx symbiote-agui insert demo --file ./view.html
npx symbiote-agui update demo --file ./state.json
npx symbiote-agui events demo
npx symbiote-agui status demo
npx symbiote-agui stop demo
```

File paths resolve from your current directory; session data lives under `~/.symbiote-agui`. Use `--no-open` on `start` when you want to open the returned URL yourself.

## Agent setup

Load the portable [Symbiote AGUI skill](./skills/symbiote-agui/SKILL.md) in the agent's harness, or copy its folder from the installed package into the harness's skill directory. The agent needs access to a shell to run the CLI.

`start` opens the session in the OS default browser. Use `start demo --no-open` to obtain the URL without opening a tab. If opening fails, the server remains available and the result includes `opened: false` and a warning; open the returned URL manually.

## Sessions and commands

### Commands and results

- IDs are case-sensitive names matching `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`, unique for the current OS user across working directories. Duplicate starts return `SESSION_EXISTS`.
- `start` starts a session and returns its URL. It does not wait for a browser connection; use the returned state to distinguish a waiting session from one with connected pages. Startup has a 30-second timeout.
- `insert` reads a UTF-8 HTML fragment from `--file` or stdin, limited to 1 MiB. Relative paths resolve from the caller's working directory. Empty input clears the content root. Interactive stdin requires a file or redirected input.
- Each insertion replaces generated content and resets local state. With connected pages, success waits for their acknowledgements and returns `delivery: "applied"`. Without a page, it retains the fragment and returns `delivery: "queued"`; rendering and module execution happen on connection.
- `update` reads a JSON state command from file or stdin with the same size limit. It requires at least one connected page and waits for acknowledgements. It does not replace markup.
- `events` returns and clears buffered UI events. The worker retains the most recent 100 events, each limited to 16 KiB; `dropped` reports overflow since the previous read. Events are temporary, not a durable log.
- `status` returns `waiting` when the worker is running without connected pages, `ready` when pages are connected, and `stopped` when the worker is absent. Running results include `url` and `clients`.
- `stop` is idempotent. It clears generated content and its WebMCP tools, notifies pages, closes connections and servers, and removes session metadata. It does not close tabs or terminate the user's browser.

Session commands write one JSON object to stdout. Success includes `{ "ok": true, "sessionId": "demo", "state": "waiting", "url": "http://127.0.0.1:PORT/#TOKEN", "clients": 0 }`. Failures include `{ "ok": false, "error": { "code": "...", "message": "..." } }`. Exit codes are 0 for success, 1 for runtime failure, and 2 for invalid input. Help and version return plain text; diagnostics go to stderr or the worker log.

### Connection and recovery

The complete session URL includes a page token in its fragment. Keep that fragment when copying or reopening the URL. The token authorizes the page connection. Treat the complete URL as private.

Pages reconnect automatically with a bounded retry delay. Reload, reconnect, or opening another tab restores the latest accepted markup and reruns its marked modules. Live component state resets to the values in that markup; `update` commands are not replayed. Retained markup lives in worker memory and is discarded by `stop`.

Validation and stylesheet loading happen before content replacement, preserving the current interface if either fails. Module code can have side effects; an execution failure can leave changed content. Delivery to several tabs and state updates are not transactions. After a failed or timed-out delivery, inspect the pages or reload the session URL before retrying. A queued insertion cannot verify browser-specific behavior until a page connects. Restoration failures also appear as `agui:error` events for the agent.

Use `status` after `SESSION_EXISTS`; reuse a session belonging to the task or choose another ID. Start a stopped session before inserting. For `PAGE_UNAVAILABLE`, open the session URL. For `INSERT_FAILED` or `UPDATE_FAILED`, correct the reported problem. If the worker stays `SESSION_UNREACHABLE`, inspect its log rather than repeatedly starting it or killing a stored PID.

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

The browser entry imports Symbiote's [WebMCP extension](https://github.com/symbiotejs/symbiote.js/blob/main/docs/webmcp.md) before rendering and enables `Symbiote.mcpToolMode`. Bound handlers become native browser tools automatically; the counter above exposes `increment_in_agui-component`. Popup bindings such as `^increment` retain their ancestor owner and source component identity. The CLI and normal UI also work when the browser has no WebMCP API.

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

To let an agent operate these tools, use a browser with WebMCP enabled and connect a WebMCP consumer to the agent. With [Chrome DevTools MCP](https://developer.chrome.com/docs/devtools/agents/webmcp-debugging), enable its WebMCP category and connect it to the Chrome profile containing your session page. Follow its [connection setup](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/advanced-usage.md#automatically-connecting-to-a-running-chrome-instance).

Select the page matching the session URL, use `list_webmcp_tools` to discover its tools, and use `execute_webmcp_tool` to invoke an action. Calling `set_count_in_tool-counter` with `{ "count": 12 }` updates the example to `Count: 12`. A connected WebMCP consumer is required for tool invocation; the CLI handles sessions, markup, state updates, and events.

For registration diagnostics, import `/client/index.js` and call `getActiveWebMCPTools()`; entries report `nativeActive`. WebMCP remains experimental.

## Session storage

Session data and logs live under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`. Set the same absolute `AGUI_STATE_DIR` for all commands to use another storage location. Session IDs remain case-sensitive.

A running session retains its latest markup in memory. Reloading or reopening its complete URL restores that interface with its initial state. Stopping the session discards the markup and events; starting the same ID creates an empty session.

For a persistent `SESSION_UNREACHABLE` error, inspect the session's `worker.log` and report the failure. Keep session URLs and tokens private.
