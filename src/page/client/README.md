# Browser interfaces

`npx symbiote-agui start <SESSION_ID>` opens the page automatically. With `--no-open`, open the returned `url` directly. The browser connects by WebSocket without an authorization request, cookie, or token link.

In shared sessions, the first eligible connection is the user and other pages are viewers. After the user disconnects, the next eligible connection or reconnection can take the role. Explicit viewer links remain read-only. Viewer pages display a sandboxed, inert snapshot of the user's light DOM and form values. They run no generated modules and expose no tools. Snapshots are coalesced, bounded to 1 MiB, and retain each viewer's scroll position. Local-only pages receive markup and state updates independently while the session runs. Local-only tabs and shared user pages restore the latest accepted markup with its initial component state on reload or reconnect; viewers reconnect to the current mirrored view.

Use `<agui-component>` for inline RAT markup and `use-template` for reusable DOM templates. Unknown custom tags using that attribute receive generic component classes. Register custom subclasses through Symbiote's `reg()` so WebMCP receives their tag identity. Definitions persist for the page lifetime; each insertion supplies fresh instances and templates.

Opt into executable code with `<script type="module" data-agui>`. Module-scope code runs before mounting so it can register component classes. An optional default export receives `(root, { emit })` after mounting and may return a cleanup function for replacement or stop. Other executable scripts remain inert. Import the fully resolved URL `new URL('/client/index.js', location.href).href` for the exported Symbiote APIs, and call `emit()` to send named JSON events to the agent.

Event bindings automatically expose Symbiote tools. Import `ToolDescriptor` for explicit actions, or `getActiveWebMCPTools` and `webMCPRegistry` for registration diagnostics. Initialize descriptors in `init$` before rendering and declare `deps` for conditional visibility. Use CLI `tools` and `call` or optional AGUI MCP to discover and invoke tools over the existing WebSocket; native browser WebMCP is optional. Replacement and stop remove generated components and their tools while tabs remain open. See the [Symbiote WebMCP guide](https://github.com/symbiotejs/symbiote.js/blob/main/docs/webmcp.md) for an explicit tool example.

Browser-side integrations can import `listPageTools()` and async `executePageTool(name, input = {})` from `/client/index.js`. These forward Symbiote's public metadata and execution results, including `isError` responses, without requiring native WebMCP. Validate inputs against the discovered schemas before invocation. Tool availability follows Symbiote's visibility and component lifecycle.

One direct JSON script initializes local state before binding setup. Named context-providers mirror local and shared fields in both directions; anonymous providers expose local fields to descendant `^` bindings. Use one provider per named context. Each insertion resets provider-owned contexts and removes subscriptions from the replaced components.

For command examples and markup syntax, see [AGUI skill](../../../skills/symbiote-agui/SKILL.md#markup-and-handlers).
