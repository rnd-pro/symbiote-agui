# Session lifecycle

Run `npx symbiote-agui start <SESSION_ID>` to start a local session and open its page in your default browser. The readable `url` has the form `http://127.0.0.1:PORT/SESSION_ID/`. The named ID stays the same across restarts; the port can change.

With `--no-open`, open the returned `url` directly. Pages establish their WebSocket connection without browser authorization, cookies, or token links. Shared sessions assign the user role to the first eligible connection and release it on disconnect; the next eligible connection or reconnection can take it. Explicit viewer links never claim the user role.

`start` returns when the session server is available. Use `npx symbiote-agui status <SESSION_ID>` when you need its connection state: `waiting` means no page is connected, `ready` means at least one page is connected, and `stopped` means the session is not running.

Insertions without a connected page return `delivery: "queued"`. Open the session URL to receive the latest markup. Connected pages acknowledge applied insertions and state updates. In local-only sessions, CLI insertions and state updates reach every connected tab; local interactions remain local until the agent sends an update. Shared sessions run the interface on one user page and mirror its rendered view to read-only viewers. Viewers cannot submit events or execute tools. CLI `call` and optional AGUI MCP tool calls target one selected page.

Local-only tabs and shared user pages restore the latest accepted markup and rerun its marked modules on reload or reconnect. Component state resets to the markup's initial values; state commands are not replayed. Viewers reconnect to the current mirrored view. Retrieve interaction events with `npx symbiote-agui events <SESSION_ID>`. Reading events clears the session's event queue.

Run `npx symbiote-agui stop <SESSION_ID>` when finished. It clears live content and tools, ends connections, and leaves browser tabs open with `Session ended.` It retains the accepted HTML and inline modules. Starting the same ID restores them and rebuilds styles, without requiring the original file; `restored: true` in the start result confirms this. Live state and events are discarded.

Run `npx symbiote-agui clear <SESSION_ID>` to remove the saved definition and live content/tools. It also works while stopped. A running session stays available for new insertions. An empty insertion instead saves a blank definition.

Private feedback registration exists only in the worker's memory. Clear, stop, and explicit feedback disable cancel pending work; restart restores no handler. The conversation binding remains fixed for the worker instance. See [feedback controls](../../docs/reference.md#private-feedback-handlers) for registration and execution limits.

Use `npx symbiote-agui stop-all` to stop recorded sessions while retaining cached markup. Use `npx symbiote-agui clear-all` to clear live and saved interfaces, including cache-only sessions; running workers remain available. Both operate only in the current storage root and report results for each discovered ID, continuing after per-session failures. A partial failure exits with code 1. Neither command closes browser tabs.

Without a library, worker metadata and logs live under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`; definitions and descriptions live in `.cache/`. A configured library stores readable HTML/Markdown pairs and gives its workers a separate private namespace. Workers retain their resolved folder and namespace at startup. Use the same `AGUI_STATE_DIR` and library settings for CLI and MCP. See the [team library guide](../../docs/library.md) for discovery and sync. Failed insertions preserve the accepted cache. Cache errors report the affected path and stop the operation. If a session remains `SESSION_UNREACHABLE`, inspect its `worker.log` and report the failure rather than repeatedly starting it.

Run `npx symbiote-agui share <SESSION_ID>` to create a public Quick Tunnel, or add `--tunnel` to `start`. The worker owns the connector and stops it during cleanup. `status` reports tunnel readiness or failure; `share` and `status` include public user and viewer links. Sharing exposes only the page server, preserves session-path and origin checks, and uses each page's own origin for assets. See the [Internet sharing reference](../../docs/reference.md#internet-sharing) for provisioning, limits, and recovery.
