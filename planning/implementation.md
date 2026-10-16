# AGUI implementation plan

Goal: Make AGUI MCP over the existing authenticated WebSocket the primary path for operating Symbiote tools in ordinary browsers, without native WebMCP support or remote debugging. Keep Chrome DevTools MCP optional. Continue using `npx symbiote-agui` for session lifecycle and markup.

## Implemented

- Readable session URLs: `start` and `status` return paths such as `/focus-desk/`. The named ID remains stable across restarts; the port and worker OS PID can change.
- Browser authorization: private authorization links establish session cookies and remove tokens from the address bar. `status <SESSION_ID> --authorize` supplies a link for another browser. Origin checks and authenticated WebSocket connections remain enforced.
- Page loading, assets, reload, reconnection, and restart authorization are verified. README and SKILL describe the current URL and authorization behavior.
- Chrome MCP is configured in Codex with `--autoConnect` and `--categoryExperimentalWebmcp`; its tool catalog is verified and setup instructions are documented. The actual browser connection remains unverified, as noted under optional work below.
- Step 1: Symbiote's published public invocation API is integrated through `listPageTools()` and `executePageTool()`. The adapter forwards discovery metadata, arguments, results, and errors. Browser checks cover native WebMCP disabled and enabled, visibility, async results, failures, replacement, and stop. The completed external prerequisite is described in the [standalone specification](./symbiote-tool-invocation.md).
- Step 2: `npx symbiote-agui mcp` serves `list_pages`, `list_tools`, and `call_tool` over standard MCP stdio. The authenticated worker and WebSocket route requests to one page, validate arguments, reject stale targets/catalogs, and bound requests without automatic retries. README and SKILL document setup and tool use. Real MCP client tests cover ordinary browsers without native WebMCP, two tabs, idempotent desk completion, results/events, errors, replacement, and reconnection.
- Step 3: Accepted HTML and inline modules are saved atomically by case-sensitive session ID outside worker directories. `start` restores the definition and rebuilds styles; `stop` retains it; `clear` removes saved and live content. Failed insertions preserve the accepted cache, and storage errors are explicit. README and SKILL describe restoration, clearing, and the initial-state boundary. Node and browser checks cover cache isolation, failed publication, source-file deletion, restored MCP tools, and clearing.

## Remaining implementation

The numbered steps below contain only pending work. Each requires explicit approval before implementation.

### 4. Document the primary MCP workflow

- Review the complete short workflow: start or restore a session, select its connected page once, list its tools, execute the requested action, and use its result as confirmation.
- Verify that waiting for user input uses CLI events without repeated status checks, DOM inspections, screenshots, or unrelated commands when tool results answer the task.
- Keep public instructions limited to current behavior, with Chrome MCP optional and specific setup errors reported directly. Do not add unrelated browser-control fallbacks.

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
