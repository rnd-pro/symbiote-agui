# Session lifecycle

Run `npx symbiote-agui start <SESSION_ID>` to start a local session and open its page in your default browser. Use `--no-open` to receive the URL without opening a tab. Keep the complete URL, including its private token fragment, when reopening or sharing it with your agent.

`start` returns when the session server is available. Use `npx symbiote-agui status <SESSION_ID>` when you need its connection state: `waiting` means no page is connected, `ready` means at least one page is connected, and `stopped` means the session is not running.

Insertions without a connected page return `delivery: "queued"`. Open the session URL to receive the latest markup. Connected pages acknowledge applied insertions and state updates. Multiple tabs receive the same commands; local interactions remain local until the agent sends an update.

Reloading or reconnecting restores the latest accepted markup and reruns its marked modules. Component state resets to the markup's initial values; state commands are not replayed. Retrieve interaction events with `npx symbiote-agui events <SESSION_ID>`. Reading events clears the session's event queue.

Run `npx symbiote-agui stop <SESSION_ID>` when finished. It clears generated content and WebMCP tools, ends connections, and leaves browser tabs open with `Session ended.` Stopping discards retained markup and events. Starting the same ID creates an empty session.

Session data and logs live under `~/.symbiote-agui/sessions/<HEX_SESSION_ID>/<INSTANCE_ID>/`. Set the same absolute `AGUI_STATE_DIR` for every command to use another storage location. If a session remains `SESSION_UNREACHABLE`, inspect its `worker.log` and report the failure rather than repeatedly starting it.
