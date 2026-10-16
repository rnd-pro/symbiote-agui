# AGUI implementation plan

Goal: Use `npx symbiote-agui` for the complete agent workflow: session lifecycle, markup, tool discovery, invocation, and events over the existing authenticated WebSocket. Keep the stdio MCP server and Chrome DevTools MCP optional. Native browser WebMCP and remote debugging are not required for CLI control.

## Implemented

- Readable session URLs: `start` and `status` return paths such as `/focus-desk/`. The named ID remains stable across restarts; the port and worker OS PID can change.
- Browser authorization: private authorization links establish session cookies and remove tokens from the address bar. `status <SESSION_ID> --authorize` supplies a link for another browser. Origin checks and authenticated WebSocket connections remain enforced.
- Page loading, assets, reload, reconnection, and restart authorization are verified. README and SKILL describe the current URL and authorization behavior.
- Chrome MCP is configured in Codex with `--autoConnect` and `--categoryExperimentalWebmcp`; its tool catalog is verified and setup instructions are documented. The actual browser connection remains unverified, as noted under optional work below.
- Step 1: Symbiote's published public invocation API is integrated through `listPageTools()` and `executePageTool()`. The adapter forwards discovery metadata, arguments, results, and errors. Browser checks cover native WebMCP disabled and enabled, visibility, async results, failures, replacement, and stop. The completed external prerequisite is described in the [standalone specification](./symbiote-tool-invocation.md).
- Step 2: `npx symbiote-agui mcp` serves `list_pages`, `list_tools`, and `call_tool` over standard MCP stdio. The authenticated worker and WebSocket route requests to one page, validate arguments, reject stale targets/catalogs, and bound requests without automatic retries. README and SKILL document setup and tool use. Real MCP client tests cover ordinary browsers without native WebMCP, two tabs, idempotent desk completion, results/events, errors, replacement, and reconnection.
- Step 3: Accepted HTML and inline modules are saved atomically by case-sensitive session ID outside worker directories. `start` restores the definition and rebuilds styles; `stop` retains it; `clear` removes saved and live content. Failed insertions preserve the accepted cache, and storage errors are explicit. README and SKILL describe restoration, clearing, and the initial-state boundary. Node and browser checks cover cache isolation, failed publication, source-file deletion, restored MCP tools, and clearing.
- Step 4: README and SKILL describe the routine start/restore, discover, call, and events workflow, session reuse, current page selection, result-based confirmation, and specific recovery actions. The CLI is the default; MCP setup is optional. Ordinary operations avoid repeated inspections.
- Step 5: CLI `pages`, `tools [--page PAGE_ID]`, and `call [--file PATH]` expose the existing authenticated tool bridge without a harness MCP connection. Calls accept JSON on stdin or from a file, validate discovered schemas, target one page, reject stale requests, and preserve native results. Native tool errors return `ok: false`, `TOOL_FAILED`, and exit code 1. Optional MCP uses the same bridge.

## Primary workflow verification

- Type checking, 26 Node tests, 7 browser tests, and the production package smoke test pass. CLI and MCP checks cover native WebMCP disabled, two tabs with one-page invocation, checkbox/progress assertions, repeated completion, results/events, visibility and cleanup, invalid/stale calls, reload/reconnection, disconnections, cache isolation, failed insertion recovery, and rejection of unauthorized access.
- The production tarball installs outside the checkout without development dependencies. Its commands verify assets, stdio MCP, missing-page and malformed-call errors, restoration, and clearing.
- An agent walkthrough used `npx symbiote-agui` from a separate tarball installation to open a desk in the regular browser, insert markup, discover tools, and complete all three tasks. Repeating the call returned `{ checked: 3, total: 3 }` and the event queue contained one completion event. After deleting the source HTML and restarting the same ID, `restored: true` confirmed restoration; tools returned and a file-based call completed the desk without reinsertion. The named URL persisted across the port change. No harness MCP, Chrome MCP, or remote debugging connection was used for this walkthrough. Native WebMCP was available in that browser; the automated CLI check separately proves operation with it disabled.

## Optional pending work: Chrome MCP verification

- Verify the configured Chrome MCP connection after resolving host access restrictions. This does not block the primary CLI workflow.
- Match the CLI's readable URL to a Chrome page ID, reuse that selection, and verify discovery and invocation through `list_webmcp_tools` and `execute_webmcp_tool` against the same Symbiote tools.
- Native WebMCP, remote debugging, and Chrome connection consent apply only to this route. Follow the official [WebMCP tool documentation](https://developer.chrome.com/docs/devtools/agents/webmcp-debugging) and [existing-browser connection setup](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/advanced-usage.md#automatically-connecting-to-a-running-chrome-instance). Apple Events access is not required.
- Do not silently switch control routes or repeat an invocation through another route after an uncertain result.
