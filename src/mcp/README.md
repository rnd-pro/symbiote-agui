# AGUI MCP

This optional stdio server shares the tool bridge used by CLI `pages`, `tools`, and `call`. The CLI requires no MCP harness configuration.

Configure your harness with command `npx` and arguments `symbiote-agui`, `mcp`. Reconnect the harness to expose the server's tools. Its stdio connection carries MCP messages; diagnostics go to stderr. Use the same `AGUI_STATE_DIR` as your CLI when overriding storage.

Use `list_tools` with a named `sessionId` after creating the interface through the CLI. A single interactive page is selected automatically, ignoring shared-session viewers. If several interactive local-only pages are connected, use `list_pages` and choose a `pageId`. Pass the returned page and discovery IDs, exact tool name, and schema-compatible input to `call_tool`.

Calls target one page and execute Symbiote's public tool API over the authenticated worker and browser WebSocket. Rediscover after tool changes; reload or reconnection requires a new page ID. Native browser WebMCP and Chrome MCP are optional. If a call times out or disconnects, its outcome may be unknown; do not retry automatically.
