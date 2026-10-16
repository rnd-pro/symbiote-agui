# Session lifecycle

Run `npx symbiote-agui start <SESSION_ID>` to start a local session and authorize its page in your default browser. The readable `url` has the form `http://127.0.0.1:PORT/SESSION_ID/`. The named ID stays the same across restarts; the port can change.

Use `--no-open` to receive a private `authorizationUrl` without opening a tab. Opening that link removes its token fragment from the address bar and establishes an HttpOnly cookie. Reloads and new tabs in that browser use the readable `url`. To authorize another browser or profile, run `npx symbiote-agui status <SESSION_ID> --authorize` and open its `authorizationUrl`. Keep authorization links private.

`start` returns when the session server is available. Use `npx symbiote-agui status <SESSION_ID>` when you need its connection state: `waiting` means no page is connected, `ready` means at least one page is connected, and `stopped` means the session is not running.

Insertions without a connected page return `delivery: "queued"`. Open the session URL to receive the latest markup. Connected pages acknowledge applied insertions and state updates. CLI insertions and state updates reach every connected tab; local interactions remain local until the agent sends an update. CLI `call` and optional AGUI MCP tool calls target one selected page.

Reloading or reconnecting restores the latest accepted markup and reruns its marked modules. Component state resets to the markup's initial values; state commands are not replayed. Retrieve interaction events with `npx symbiote-agui events <SESSION_ID>`. Reading events clears the session's event queue.

Run `npx symbiote-agui stop <SESSION_ID>` when finished. It clears live content and tools, ends connections, and leaves browser tabs open with `Session ended.` It retains the accepted HTML and inline modules. Starting the same ID restores them and rebuilds styles, without requiring the original file; `restored: true` in the start result confirms this. Live state and events are discarded.

Run `npx symbiote-agui clear <SESSION_ID>` to remove the saved definition and live content/tools. It also works while stopped. A running session stays available for new insertions. An empty insertion instead saves a blank definition.

Use `npx symbiote-agui stop-all` to stop recorded sessions while retaining cached markup. Use `npx symbiote-agui clear-all` to clear live and saved interfaces, including cache-only sessions; running workers remain available. Both operate only in the current storage root and report results for each discovered ID, continuing after per-session failures. A partial failure exits with code 1. Neither command closes browser tabs.

Worker metadata and logs live under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`; durable definitions live in `~/.symbiote-agui/sessions/.cache/<HEX_SESSION_ID>.html`. Set the same absolute `AGUI_STATE_DIR` for every command and MCP to use another storage root. Failed insertions preserve the accepted cache. Cache errors report the affected path and stop the operation. If a session remains `SESSION_UNREACHABLE`, inspect its `worker.log` and report the failure rather than repeatedly starting it.

Run `npx symbiote-agui share <SESSION_ID>` to create a public Quick Tunnel, or add `--tunnel` to `start`. The worker owns the connector and stops it during cleanup. `status` reports tunnel readiness or failure; `status --authorize` includes its private authorization link. Sharing exposes only the page server, preserves origin checks and browser authorization, and uses each page's own origin for assets and discovery. See the root [Internet sharing instructions](../../README.md#internet-sharing) for provisioning, limits, and recovery.
