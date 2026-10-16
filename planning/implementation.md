# AGUI implementation plan

Status: Planned. Implementation requires user approval.

Goal: An agent creates and restores interfaces through `npx symbiote-agui`, then operates their registered WebMCP tools through Chrome DevTools MCP. Reuse the user's running Chrome and the established MCP connection. Routine tasks use these two interfaces without ad hoc browser scripts or repeated inspections. Browser connection consent and host sandbox authorization remain outside AGUI's control.

## 1. Connect the existing WebMCP consumer

- Configure Chrome DevTools MCP in the agent harness with `--autoConnect` and `--categoryExperimentalWebmcp`. Its tools must actually be available to the agent; launching an MCP process alone does not attach it to a conversation.
- Document the setup prerequisites: a Chrome browser with WebMCP enabled, remote debugging access, and approval of the browser connection. Reuse that connection during the workflow; do not request Apple Events access.
- Use the existing `list_webmcp_tools` and `execute_webmcp_tool` tools. Symbiote already supplies registration, executors, schemas, visibility, and lifecycle; no Symbiote API changes are planned.
- This workflow requires a configured Chrome DevTools MCP consumer. Other browsers can still display AGUI pages, but are outside this tool-execution workflow.
- Follow the official [WebMCP tool documentation](https://developer.chrome.com/docs/devtools/agents/webmcp-debugging) and [existing-browser connection setup](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/advanced-usage.md#automatically-connecting-to-a-running-chrome-instance).

## 2. Make page targeting and actions reliable

- Match the URL returned by the CLI to the corresponding Chrome MCP page ID, then reuse that page ID. Never assume the active tab is the intended session or invoke an action in every matching tab.
- Coordinate restoration, module mounting, and tool discovery with bounded waits. Discover registered tools and their schemas through MCP, then invoke the requested action directly and return its result.
- Give generated actions meaningful descriptions and results. For the desk, expose an idempotent completion action that sets checkbox state explicitly instead of requiring blind toggles.
- Rediscover tools after content replacement or page restart. Report missing tools and execution failures clearly; do not automatically retry a call whose outcome is unknown.
- Keep AGUI's WebSocket for markup, state commands, and interaction events. Do not add custom CLI `tools`/`call` commands, another action registry, or a browser API emulation layer.

## 3. Cache interfaces by session ID

- Persist the last accepted HTML fragment, including inline modules, atomically in a durable cache outside the disposable worker instance directory.
- `start <SESSION_ID>` restores cached markup and rebuilds its styles automatically. It must not depend on the original input file or ask the agent to generate the interface again.
- `stop` retains the cache while removing live worker metadata and credentials. Add an explicit `clear <SESSION_ID>` command to clear generated content and its cached definition.
- Keep case-sensitive session IDs and `AGUI_STATE_DIR` isolation. Failed insertions must preserve the last accepted cache; report cache errors instead of silently replacing saved content.
- This cache restores the interface definition. Live application state starts from that definition; persisting timers, closures, or user progress is a separate feature.

## 4. Make the skill describe the complete agent workflow

- Update the root README and bundled SKILL in place. Distinguish environment setup from routine use: CLI for starting/restoring, inserting, updating, events, and stopping; Chrome MCP for WebMCP discovery and execution.
- Describe the short workflow: start or restore a session, select its page once, list its WebMCP tools, execute the requested action, and use its result as confirmation.
- Use CLI events when awaiting user interaction. Avoid repeated status checks, DOM inspections, screenshots, or unrelated commands when tool results answer the task.
- Document current behavior and actual prerequisites only. If the MCP connection or browser WebMCP support is missing, report the specific setup issue rather than attempting unrelated browser-control mechanisms.

## 5. Prove the actual user workflow

- Run the packed production package from outside the checkout. Use `npx symbiote-agui` for page lifecycle and the actual Chrome MCP `list_webmcp_tools`/`execute_webmcp_tool` consumer for agent actions. Browser fixtures may verify results but must not execute the requested action on the agent's behalf.
- Create the desk, discover its tools, execute its completion action through MCP, and verify every checkbox is checked, progress is correct, and expected interaction events exist. Calling the completion action again must leave all boxes checked.
- Stop and restart the same ID after deleting the original HTML file. Confirm the cached interface and its tools return without another insertion.
- Cover two tabs with one invocation, tool cleanup after replacement, invalid/stale calls, cache isolation, and failed insertion recovery. Missing MCP connectivity or browser support must produce an actionable setup failure.
- Run type checking and focused Node/browser/package regression checks. Finish with one manual desk walkthrough through the CLI and the configured Chrome MCP connection. Do not mark the workflow complete based only on registration tests or in-page JavaScript execution.
