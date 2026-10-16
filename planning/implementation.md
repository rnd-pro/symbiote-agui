# AGUI implementation plan

Goal: Make AGUI MCP over the existing authenticated WebSocket the primary path for operating Symbiote tools in ordinary browsers, without native WebMCP support or remote debugging. Keep Chrome DevTools MCP optional. Continue using `npx symbiote-agui` for session lifecycle and markup.

## Implemented

- Readable session URLs: `start` and `status` return paths such as `/focus-desk/`. The named ID remains stable across restarts; the port and worker OS PID can change.
- Browser authorization: private authorization links establish session cookies and remove tokens from the address bar. `status <SESSION_ID> --authorize` supplies a link for another browser. Origin checks and authenticated WebSocket connections remain enforced.
- Page loading, assets, reload, reconnection, and restart authorization are verified. README and SKILL describe the current URL and authorization behavior.
- Chrome MCP is configured in Codex with `--autoConnect` and `--categoryExperimentalWebmcp`; its tool catalog is verified and setup instructions are documented. The actual browser connection remains unverified, as noted under optional work below.
- Step 1: Symbiote's published public invocation API is integrated through `listPageTools()` and `executePageTool()`. The adapter forwards discovery metadata, arguments, results, and errors. Browser checks cover native WebMCP disabled and enabled, visibility, async results, failures, replacement, and stop. The completed external prerequisite is described in the [standalone specification](./symbiote-tool-invocation.md).

## Remaining implementation

The numbered steps below contain only pending work. Each requires explicit approval before implementation.

### 2. Add the AGUI MCP bridge and page targeting

- Add `npx symbiote-agui mcp` as a standard MCP server over stdio, configured once in the agent harness. Keep stdout dedicated to MCP messages and send diagnostics to stderr.
- Route MCP discovery and invocation through the existing authenticated worker control channel and browser WebSocket. Preserve markup, state, and event delivery on that connection. Use Symbiote's supported discovery and invocation APIs; do not add another action registry or emulate browser APIs.
- Target the named session and one connected page explicitly. Reuse its connection identity, report stale or disconnected targets, and never broadcast an action to every tab. With one connected page, selection can be automatic; with several, expose enough information to select one.
- Coordinate restoration, module mounting, and tool discovery with bounded waits. Forward tool schemas, arguments, results, and errors through MCP, validate inputs, and enforce request correlation and timeouts.
- Give generated actions meaningful descriptions and results. For the desk, expose an idempotent completion action that sets checkbox state explicitly instead of requiring blind toggles.
- Rediscover tools after content replacement or page restart. Report missing tools and execution failures clearly; do not automatically retry a call whose outcome is unknown.
- Keep CLI commands for session lifecycle, markup, state updates, and events. Tool discovery and execution belong to the MCP server; separate CLI `tools`/`call` commands are unnecessary.

### 3. Cache interfaces by session ID

- Persist the last accepted HTML fragment, including inline modules, atomically in a durable cache outside the disposable worker instance directory.
- `start <SESSION_ID>` restores cached markup and rebuilds its styles automatically. It must not depend on the original input file or ask the agent to generate the interface again.
- `stop` retains the cache while removing live worker metadata and credentials. Add an explicit `clear <SESSION_ID>` command to clear generated content and its cached definition.
- Keep case-sensitive session IDs and `AGUI_STATE_DIR` isolation. Failed insertions must preserve the last accepted cache; report cache errors instead of silently replacing saved content.
- This cache restores the interface definition. Live application state starts from that definition; persisting timers, closures, or user progress is a separate feature.

### 4. Document the primary MCP workflow

- Update the root README and bundled SKILL in place. Describe one-time AGUI MCP setup using `npx symbiote-agui mcp`, then routine use: CLI for starting/restoring, inserting, updating, events, and stopping; AGUI MCP for Symbiote tool discovery and execution.
- Describe the short workflow: start or restore a session, select its connected page once, list its tools, execute the requested action, and use its result as confirmation.
- Use CLI events when awaiting user interaction. Avoid repeated status checks, DOM inspections, screenshots, or unrelated commands when tool results answer the task.
- Present Chrome MCP as optional. Keep its remote debugging, native WebMCP, and browser permission requirements out of the primary setup path.
- Document current behavior and actual prerequisites only after implementation. If the AGUI MCP server or authenticated page connection is unavailable, report the specific setup issue rather than attempting unrelated browser-control mechanisms.

### 5. Verify the complete primary workflow

- Run the packed production package from outside the checkout. Use `npx symbiote-agui` for page lifecycle and the AGUI MCP server connected to the agent harness for discovery and actions. Prove the primary flow with native browser WebMCP disabled and without Chrome MCP or remote debugging. Browser fixtures may verify results but must not execute the requested action on the agent's behalf.
- Create the desk, discover its tools, execute its completion action through MCP, and verify every checkbox is checked, progress is correct, and expected interaction events exist. Calling the completion action again must leave all boxes checked.
- Stop and restart the same ID after deleting the original HTML file. Confirm the cached interface and its tools return without another insertion.
- Verify the readable session URL, asset loading, reload/reconnection, session/page targeting, and rejection of unauthorized access. Confirm the named ID remains visible after a worker restart.
- Cover two tabs with one invocation, tool cleanup and visibility changes, invalid/stale calls, disconnects and uncertain results, cache isolation, and failed insertion recovery. Missing MCP or page connectivity must produce an actionable setup failure.
- Run type checking and focused Node/browser/package regression checks. Finish with one manual desk walkthrough through the CLI and configured AGUI MCP connection. Do not mark the workflow complete based only on registration tests or in-page JavaScript execution.

## Optional pending work: Chrome MCP verification

- Verify the configured Chrome MCP connection after resolving host access restrictions. This does not block the primary AGUI MCP workflow.
- Match the CLI's readable URL to a Chrome page ID, reuse that selection, and verify discovery and invocation through `list_webmcp_tools` and `execute_webmcp_tool` against the same Symbiote tools.
- Native WebMCP, remote debugging, and Chrome connection consent apply only to this route. Follow the official [WebMCP tool documentation](https://developer.chrome.com/docs/devtools/agents/webmcp-debugging) and [existing-browser connection setup](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/advanced-usage.md#automatically-connecting-to-a-running-chrome-instance). Apple Events access is not required.
- Do not silently switch control routes or repeat an invocation through another route after an uncertain result.
