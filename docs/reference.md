# AGUI reference

For an introduction and first-use setup, see the [README](../README.md). See the [team library guide](./library.md) for Git-based reuse, folder settings, descriptions, and syncing. Interface generation, Symbiote patterns, and tool invocation are covered by the [AGUI skill](../skills/symbiote-agui/SKILL.md).

## Session controls

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

## Saved interfaces and reconnection

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
