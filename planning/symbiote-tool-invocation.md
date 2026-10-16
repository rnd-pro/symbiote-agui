# External task: transport-independent Symbiote tool invocation

Status: Implemented and published through the independent Symbiote.js workflow. AGUI integrates the public API through its browser adapter.

## Purpose

Allow applications and transport adapters to discover and invoke registered Symbiote tools without requiring the browser's native WebMCP API. Keep this capability generic so any project using Symbiote can use it.

The WebMCP extension exposes metadata through `getActiveWebMCPTools()` and invocation through `executeWebMCPTool()`. Both use the existing tool registry and work independently of native browser registration.

## Public contract

- Keep `getActiveWebMCPTools()` as the discovery API, including tool names, descriptions, and input schemas.
- Export `executeWebMCPTool(name, input)` from `@symbiotejs/symbiote/webmcp`.
- Resolve the current tool by its registered name and invoke its existing executor. Preserve owner binding and automatic event-handler behavior, including popup and item context.
- Support synchronous and asynchronous handlers. Return their results and use consistent error handling for direct and native invocation. Return an explicit unavailable-tool error for missing, hidden, or unregistered tools.
- Make direct discovery and invocation work when native WebMCP is absent or native registration fails. Keep `nativeActive` specific to native registration.
- Preserve lifecycle cleanup and dynamic visibility. Removed tools must no longer be callable, and executor references must be released with their registrations.

## Scope and compatibility

Implement this as an additive capability of the existing optional WebMCP extension. Existing imports, component definitions, tool names, descriptors, and native registration behavior must remain compatible. Reuse existing registration and execution logic; keep executable references out of serialized discovery metadata.

Symbiote should not acquire an MCP server, WebSocket transport, session management, or any AGUI dependency. Native browser registration options remain unchanged. External adapters are responsible for transport authentication, target selection, input-schema validation, and serialization of results; document this boundary.

An adapter belongs in each consuming application and calls these public APIs. Avoid intercepting `registerTool`, emulating `navigator.modelContext`, inspecting component internals, or maintaining a second tool registry.

## Acceptance and handoff

- Verify automatic handlers and explicit descriptors, including component and shared-context tools, with native WebMCP both present and absent.
- Verify owner binding, asynchronous results, thrown/rejected errors, visibility changes, component removal, context deletion, and calls to unavailable tools.
- Confirm existing native WebMCP registration and invocation still work without changes in consuming applications.
- Add public API documentation and types, then release through Symbiote's own workflow. Provide the consuming projects with the published release and final API contract.

AGUI's browser adapter calls these public APIs. Forwarding discovery and invocation over its authenticated WebSocket belongs to the AGUI implementation workflow.
