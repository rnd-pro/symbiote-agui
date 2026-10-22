# AGUI reference

For an introduction and first-use setup, see the [README](../README.md). See the [team library guide](./library.md) for Git-based reuse, folder settings, descriptions, and syncing. Interface generation, Symbiote patterns, and tool invocation are covered by the [AGUI skill](../skills/symbiote-agui/SKILL.md).

## Session manager

```sh
npx symbiote-agui manager
npx symbiote-agui manager --no-open
npx symbiote-agui manager status
npx symbiote-agui manager stop
```

The built-in Symbiote page calls AGUI functions directly over its own authenticated WebSocket. It does not need an agent, MCP setup, or browser debugging. It lists running and saved sessions, descriptions, clients, process IDs, and current links. Search, status filters, individual controls, and scoped bulk actions use the shared UI library. The theme toggle selects light/dark, and Use system theme restores your operating system preference. Your choice is remembered across reloads and synchronized between tabs in the same browser at the manager URL.

One detached manager runs per private state directory and resolved library folder. Repeating `manager` reuses it. Its storage scope is fixed at startup; changing the project folder setting selects a separate manager on the next launch. Session stop/clear-all commands leave the manager running. `manager stop` stops only the manager and waits for accepted operations to finish.

Launching opens and authorizes your browser automatically. With `--no-open`, open the returned private `launchUrl` once. Its credential is removed from the address bar and retained in that browser's storage for reloads, reconnects, and additional tabs. The readable `url` works afterward in that browser. Keep `launchUrl` private. A different browser needs the launch link from `manager` too.

The manager binds only to loopback, validates Host/Origin and operation inputs, and cannot be framed or published through AGUI tunnels. Ordinary generated pages and public user/viewer pages cannot call its management operations. Worker control tokens stay inside Node. The manager page serves packaged assets only and cannot run arbitrary functions, shell commands, or access a browser-selected filesystem path.

Use Attach tunnel on a running local session to create public user and viewer links without restarting its worker or resetting its live interface. Failed attachment leaves the session available and exposes Retry tunnel. Tunnel attached identifies an existing connector; use the public links to share it, Check tunnel to verify reachability, or Renew tunnel to replace inactive links. The CLI equivalent is `npx symbiote-agui share <SESSION_ID>`.

Every connection loads fresh backend state. While visible, the page refreshes roughly every five seconds and after operations, including changes made through the CLI or Git. Tunnel reachability is checked separately with Check tunnel; check times and stale/unchecked health are shown. Renew replaces public links. Sync resets live interface state. Clear requires confirmation and deletes saved HTML and Markdown, including files in a configured Git library.

Operation results include individual bulk failures. Repeated mutation request IDs reuse their result for ten minutes; conflicting operations on a session run in sequence. A disconnect or timeout can leave an unknown outcome. The page refreshes after reconnecting and never automatically replays an action. Review current status before deliberately submitting it again.

## Session controls

Local, shared user, and viewer tabs use the session ID as their browser title. A colored emoji favicon is selected from a fixed palette by session ID and stays the same across reloads and restarts. Colors can repeat between sessions.

Use Node.js 24 or newer. Session IDs are case-sensitive, contain 1-64 letters, digits, underscores, or hyphens, and start with a letter or digit. Private-cache IDs are shared across working directories for the current OS user. A configured library scopes IDs to its folder; use names that differ beyond letter case in a shared folder for portability.

```sh
npx symbiote-agui start my-workspace
npx symbiote-agui start all
npx symbiote-agui status all
npx symbiote-agui status my-workspace
npx symbiote-agui stop my-workspace
npx symbiote-agui stop all
npx symbiote-agui clear my-workspace
```

- `start` opens the regular browser and restores the saved interface when available. With `--no-open`, open the returned `url` yourself.
- `start all` starts saved and recorded sessions in the current storage root, reuses running workers without resetting their interfaces, and opens their pages. Use `--no-open` to return links without opening tabs. It returns per-session results and continues after failures. Restarted sessions restore saved definitions and run locally; use `share <SESSION_ID>` to create new public links.
- `status` reports `waiting` without connected pages, `ready` with connected pages, or `stopped`. A shared session can have viewers connected while waiting for an interactive user.
- `status all` lists all recorded and saved sessions in the current storage root. Each successful result has `active: true` for a running session or `active: false` with `state: "stopped"` for an inactive session. Running sessions include verified OS process IDs (`pid`), local URLs, and current public user/viewer URLs when sharing is active. Inactive sessions have no live links or PID. Unreachable sessions report individual failures with `active: null` (unknown) without hiding other results. Results contain `command`, `total`, and a `sessions` array; partial failures set `ok: false` and exit with code 1. The word `all` selects the bulk operation for `start`, `status`, and `stop`.
- `stop` ends the session and its tunnel, retaining the saved interface. Tabs remain open with `Session ended.`.
- `clear` discards the saved interface and clears live content. A running session and its tunnel stay available. Clearing also works while stopped.

`stop all` (also available as `stop-all`) stops every session and its tunnel in the current storage root, retaining saved interfaces. `clear-all` discards every saved definition and clears live interfaces while keeping workers running. Both include sessions created from other directories and report per-session results, continuing after individual failures. `all` is reserved for the bulk operation in `start all`, `status all`, and `stop all`.

Run `npx symbiote-agui --help` for the command list. Session commands return JSON, except help and version. Exit codes are 0 for success, 1 for runtime failure, and 2 for invalid input.

## Session data-flow metadata

Saved sessions can carry structured private metadata alongside their Markdown description:

```sh
npx symbiote-agui metadata get my-workspace
npx symbiote-agui metadata set my-workspace --file ./metadata.json
npx symbiote-agui metadata clear my-workspace --key dataFlow
```

`get` returns `{ sessionId, metadata }` inside the normal CLI result. `set` accepts JSON from a file or stdin, replacing each supplied top-level metadata field and retaining omitted fields. A supplied `dataFlow` must be complete; nested objects are not merged. `clear --key dataFlow` removes only that field, preserving HTML, Markdown, and application data. Commands work with stopped and running saved sessions without restarting workers.

Example `metadata.json` using fictional data:

```json
{
  "dataFlow": {
    "description": "Edit a sample inventory.",
    "initialSource": {
      "kind": "json-file",
      "reference": "sample-inventory.json",
      "description": "Manually imported records."
    },
    "bindings": [{ "provider": "INVENTORY", "keys": ["records"] }],
    "targets": [
      { "kind": "agui-cache", "description": "Intended local snapshot." },
      { "kind": "database", "reference": "demo.inventory", "description": "Authorized agent-mediated updates." }
    ]
  }
}
```

`dataFlow` requires a description, one `initialSource`, nonempty provider `bindings`, and nonempty `targets`. Each endpoint has `kind`, `description`, and an optional non-secret `reference`. Kinds are `inline-json`, `json-file`, `agui-cache`, `database`, `api`, `manual`, or `other`. Group unique plain property keys under each unique provider. Input is limited to 16 KiB; unknown fields, runtime settings, and credential-bearing URLs are rejected. URL references use HTTP(S) without credentials, query strings, or fragments; use a descriptive resource name when a URL is unsuitable. Never include credentials or application records in descriptions or references.

`describe` returns full metadata when present. `list --query` searches it and returns a data-flow summary; the local manager displays that summary and includes the full flow in its Description dialog. Metadata describes intended behavior, not proof of synchronization or authorization to perform it. Editing it does not read a source, write a target, change initial application values, or trigger feedback. Preserve the original source description when a cache restores the same data.

Metadata lives under the private, library-scoped state root in `.metadata/`, outside shared definitions and worker instance directories. Stop/start, insert, sync, and Markdown edits retain it; clearing the session removes it. Copying HTML/Markdown or importing a private definition into a team folder does not copy metadata. To transfer it intentionally, prepare a file containing the desired `metadata` object from `get` and run `set` in the destination scope. Review local references before sharing that file. Reloading an existing manager does not update its running code; restart the manager after upgrading to load the new metadata UI.

## Private feedback handlers

The CLI can register a private command for the current worker. Explicit browser submissions can invoke that command; ordinary events are never forwarded automatically. Verify native delivery to the same originating conversation, including idle and busy behavior, before configuring it. Delivery acknowledgement does not confirm an external write.

```sh
npx symbiote-agui feedback status my-workspace
npx symbiote-agui feedback configure my-workspace --file /private/path/feedback.json
npx symbiote-agui feedback disable my-workspace
```

All three commands require a running session. `configure` accepts JSON from `--file` or stdin:

```json
{
  "sessionId": "my-workspace",
  "instanceId": "CURRENT_INSTANCE_ID_FROM_FEEDBACK_STATUS",
  "conversationId": "ORIGINATING_CONVERSATION_ID",
  "command": {
    "executable": "/absolute/path/to/node",
    "args": ["/private/path/to/session-feedback.mjs"],
    "cwd": "/absolute/path/to/workspace",
    "input": { "channel": "stdin" }
  }
}
```

The executable and optional working directory must exist and use absolute paths. The worker spawns the command with `shell: false`, passing a JSON envelope through stdin with a newline and EOF. For a native command accepting an argument, use `input: { "channel": "argument", "index": 0 }`; `index` inserts the envelope as one argument into the fixed `args` array, from zero through its length. The envelope contains the event, submission ID, application revision when supplied, session instance, session ID, and registered conversation ID. The process receives a limited environment for paths, home/config directories, locale, and temporary files; arbitrary worker variables such as `NODE_OPTIONS` are not inherited.

The handler must report native acknowledgement with one JSON object on stdout: `{ "state": "accepted", "receiptId": "optional-native-id" }`, `{ "state": "unavailable" }`, `{ "state": "rejected" }`, or `{ "state": "unknown" }`. Receipt IDs allow 1-256 letters, digits, underscores, dots, colons, or hyphens. Exit zero alone does not confirm delivery. Raw output and command configuration are excluded from public status. Credentials belong in existing authorized local access, never event payloads or command arguments.

Execution is ordered on a separate queue. Limits are 16 KiB per configuration/submission message, 16 pending submissions, 100 retained receipts, 10 seconds per command, and 8 KiB of combined stdout/stderr. A full queue rejects new work explicitly. Identical submission IDs reuse retained receipts; conflicting payloads are rejected. Timeout, malformed acknowledgement, or a failure after dispatch reports an unknown outcome and never retries automatically. External persistence needs a separate verified acknowledgement from the agent.

Registration stays in memory and is disabled by clear, stop, explicit disable, or a handler reporting the conversation unavailable. Disabling rejects queued work and terminates active commands; publication already accepted by a native harness cannot be undone. POSIX cleanup targets the spawned process group; Windows cleanup targets the direct child. The originating conversation binding lasts for the worker instance, so changing conversations requires a new instance. Restarted workers have feedback disabled. Older workers report unsupported feedback and are not restarted automatically.

### Explicit browser submissions

Marked modules receive `submitFeedback` alongside `emit`, and `/client/index.js` exports it for component methods. Call it inside a real Save/Apply/Submit handler after local validation and saving the local draft. Read fields from the existing Symbiote context; keep normal input bindings and `pub-to` attributes.

```js
let delivery = await submitFeedback({
  type: 'changes.submitted',
  source: 'contact-editor',
  data: { name: this.$.name, role: this.$.role },
}, { userEvent, submissionId: commitId, revision });
```

`userEvent` must be the trusted native click or submit event received by the handler. Each event can submit once. Synthetic events, native agent-invoked form submissions, restoration, and agent-driven page/tool commands are blocked. Omit `submissionId` to generate a UUID, or use an application's immutable commit UUID. Supply the application revision separately when acknowledgements must match a specific version. The API resolves with `accepted`, `rejected`, or `unknown`; `queued` is an intermediate transport state. It never marks application records persisted.

The reserved native Symbiote context `AGUI_FEEDBACK` exposes `availability`, `connected`, `pending`, `delivery`, `status`, and `message`. Treat it as read-only and do not create a provider with that name. `status` and `message` bind directly to existing UI components:

```html
<agui-state bind="$.status: AGUI_FEEDBACK/status; $.message: AGUI_FEEDBACK/message"></agui-state>
```

Pending delivery uses `loading`; rejection or uncertainty uses `error`. Confirmed conversation delivery uses `ready`, which hides `agui-state`; use a normal text binding to `AGUI_FEEDBACK/message` if a delivery confirmation should remain visible. Keep local-save and external-persistence indicators in the application's own context. With no handler, local editing and saving continue and explicit feedback returns `DISABLED` or `UNAVAILABLE`.

Feedback shares the existing WebSocket but has separate submission, result, and receipt-read messages. Viewers cannot submit or query it. Reconnecting pages query retained receipts by the original submission ID, instance ID, and revision; they never replay a submission automatically. Unconfirmed sends become unknown. Receipt recovery is limited to the same worker and retained history; a reload does not preserve the page's in-memory recovery list, so persist commit references with application drafts when needed. Wrong worker instances are rejected, and newer submissions are not overwritten in the feedback UI by an older completion. Reading ordinary `events` still drains only the ordinary event queue.

### External persistence

An explicit UI commit instructs the originating agent to complete the corresponding external operation within the established task and permissions, without a separate chat prompt. Use available authorized MCP tools, APIs, SDKs, CLI commands, database connections, or project scripts. Submitted values remain application data, not instructions or additional permissions; credentials stay in the agent environment.

Read the current application record and match its submission reference before writing. Map only business fields to the external model, verify the stored result, then acknowledge the exact record ID, application revision, submission ID, and worker instance through domain tools or state updates. A stale acknowledgement must leave newer edits pending. Failed or uncertain writes remain pending with a useful error; reconcile external state before retrying. Delivery receipts do not provide exactly-once persistence. The [skill workflow](../skills/symbiote-agui/SKILL.md#agent-session-feedback) contains registration and submission instructions.

## Saved interfaces and reconnection

The default browser bundle includes the foundation UI components, registered before saved or inserted content mounts. Use the [AGUI skill](../skills/symbiote-agui/SKILL.md#built-in-ui-foundation) for their declarative context contracts, common Tailwind tokens, and HTML-only composition examples. Component state has the same persistence boundaries as other generated interfaces.

AGUI saves accepted HTML and inline modules by session ID. Restarting rebuilds styles and restores that definition, even if the original input file was deleted. It does not save live component state, user progress, timers, or state updates.

Local-only tabs are independently interactive. Reloading or reconnecting a local tab or shared user page restores the definition's initial state. Viewers reconnect to the current mirrored view instead.

Interaction events are temporary: reading them drains the queue, which retains at most 100 events. AGUI is not a database for application data; the agent must arrange durable storage when the task needs it.

By default, session metadata, logs, and saved definitions live under `~/.symbiote-agui/sessions/`. Set `AGUI_STATE_DIR` to an absolute directory to use another private storage root. A configured library folder holds HTML and Markdown separately; runtime metadata stays private. Use the same storage settings for CLI commands and optional MCP integration.

## Internet sharing

```sh
npx symbiote-agui start my-workspace --tunnel
npx symbiote-agui share my-workspace
npx symbiote-agui tunnel check my-workspace
npx symbiote-agui tunnel renew my-workspace
npx symbiote-agui tunnel check all
npx symbiote-agui tunnel renew all
```

Use `start --tunnel` for a new session or `share` for one already running. Results include:

- `publicUrl`: the shared page.
- `publicUserUrl` (`?mode=user`): requests the interactive role.
- `publicViewerUrl` (`?mode=viewer`): always read-only, including before a user arrives.

The first eligible connection gets the user role. Other connections are viewers while that user is connected. After disconnect, the next eligible connection or reconnection can take the role. Existing viewers stay viewers until reconnecting; explicit viewer links never claim the role. If local tabs are already connected when sharing starts, the first connected tab becomes the user.

Viewers receive the current rendered view and subsequent user and agent updates. They run no generated modules, expose no tools, and cannot submit actions or events. They retain the last view when the user disconnects. New insertions wait for a user to render them; clearing removes the old view immediately.

Mirroring covers light DOM and ordinary form values, with a 1 MiB snapshot limit. Password values are omitted. Canvas, video frames, embedded pages, and shadow-root contents are not streamed. Viewers can scroll independently.

AGUI uses `cloudflared` from PATH or downloads and verifies an official binary once. Automatic provisioning supports macOS/Linux on x64 or arm64 and Windows on x64. Set `AGUI_CLOUDFLARED_PATH` to an absolute executable path before starting a session to select an installation. Provisioning and tunnel connection can take up to 90 seconds after local startup.

Repeated `share` calls reuse the running tunnel. `tunnel renew <SESSION_ID>` closes its connector and creates replacement public links while keeping the session, interface, and local URL available. It also enables sharing for a running session without a tunnel. Open and distribute the new links; old public pages can disconnect. If replacement fails, the local session remains available and the old tunnel is not restored.

`tunnel check <SESSION_ID>` and `status` verify the public URL with a fresh, session-specific response, with a five-second request timeout. Connector `tunnel.state: "ready"` alone does not establish public reachability. `tunnel.active` is `true` when reachable, `false` when inactive or the check fails, and `null` when a newly created connector has not been checked. `tunnel.checkedAt` records a completed public check; `tunnel.checkError` explains failures separately from connector errors. A failed check does not prove Cloudflare disabled the tunnel: local network or DNS failures can also cause it. Public URL fields identify the configured hostname; check `tunnel.active` before using them. Checks do not create or replace tunnels.

`tunnel renew all` and `tunnel check all` target running sessions already configured for sharing, including failed connectors. They skip saved-only sessions and running sessions without sharing, report per-session results, and continue after failures. A failed check or renewal exits with code 1 and preserves available status details. An empty batch succeeds. If a worker reports that tunnel renewal is unavailable, stop and start that session before retrying.

Restarting a worker requires sharing again and creates a new hostname. Public links are accessible to anyone who has them and require the host to stay online. Cloudflare Quick Tunnels are temporary and have no uptime guarantee. See [Cloudflare's limits](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/#limitations).

Only the page server is exposed. The CLI control server stays local and authenticated. Browser connections require no cookie, token, or authorization request; WebSocket admission checks the session path and allowed origin.

## Optional AGUI MCP

The CLI workflow requires no MCP setup. To expose AGUI tools directly in a compatible agent environment, add an MCP server with:

```json
{
  "command": "npx",
  "args": ["symbiote-agui", "mcp"]
}
```

Reconnect the agent environment after configuration. This stdio server exposes `list_pages`, `list_tools`, and `call_tool` over the same worker and WebSocket used by the CLI. Shared-session viewers are excluded from automatic tool targeting. Session creation and content delivery remain available through the CLI.

## Optional Chrome DevTools MCP

Use this integration when you need native browser WebMCP access or browser inspection.

1. Enable WebMCP in Chrome using the [Chrome WebMCP instructions](https://developer.chrome.com/docs/devtools/agents/webmcp-debugging).
2. Enable remote debugging at `chrome://inspect/#remote-debugging`.
3. Add Chrome DevTools MCP to your agent environment with command `npx` and arguments `chrome-devtools-mcp`, `--autoConnect`, and `--categoryExperimentalWebmcp`.
4. Reconnect the agent environment and approve Chrome's connection prompt.

The agent needs `list_pages`, `list_webmcp_tools`, and `execute_webmcp_tool`. Apple Events access is not required. On macOS, a missing `DevToolsActivePort` error can indicate that the host app needs Google Chrome access under System Settings > Privacy & Security > Files & Folders.

See the [Chrome connection guide](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/advanced-usage.md#automatically-connecting-to-a-running-chrome-instance). For Symbiote APIs and explicit tool examples, see the [Symbiote WebMCP guide](https://github.com/symbiotejs/symbiote.js/blob/main/docs/webmcp.md).

## Troubleshooting

- `SESSION_EXISTS`: use `status` to find the existing session; do not repeatedly start it.
- `PAGE_UNAVAILABLE`: open the session URL. Shared sessions need a user connection for state updates and tool calls.
- `TUNNEL_FAILED`: the local session remains running. Inspect `status`, correct the reported problem, and use `tunnel renew <SESSION_ID>` to replace stale links or `share` to retry a failed connector. Later connector exits also appear in status.
- `CACHE_ERROR`: inspect the reported storage path. Failed insertions preserve the saved definition, although a page may already have received changes.
- `SESSION_UNREACHABLE`: inspect the session's `worker.log` rather than repeatedly starting it or killing a stored process ID.

A failed browser opener returns `opened: false` and readable URLs; open the appropriate URL manually. A failed or timed-out tool call can have an unknown outcome. Check its result before asking the agent to repeat it.
