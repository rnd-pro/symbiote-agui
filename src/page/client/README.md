# Browser interfaces

`npx symbiote-agui start <SESSION_ID>` opens and authorizes the page automatically. With `--no-open`, open the returned private `authorizationUrl`; its token is removed from the address bar after loading. The readable `url` contains the session ID and works for reloads and new tabs in that authorized browser. To authorize another browser, use `npx symbiote-agui status <SESSION_ID> --authorize`.

The page receives markup and state updates while the session runs. Reloading or reconnecting restores the latest accepted markup with its initial component state.

Use `<agui-component>` for inline RAT markup and `use-template` for reusable DOM templates. Unknown custom tags using that attribute receive generic component classes. Register custom subclasses through Symbiote's `reg()` so WebMCP receives their tag identity. Definitions persist for the page lifetime; each insertion supplies fresh instances and templates.

Opt into executable code with `<script type="module" data-agui>`. Module-scope code runs before mounting so it can register component classes. An optional default export receives `(root, { emit })` after mounting and may return a cleanup function for replacement or stop. Other executable scripts remain inert. Import the fully resolved URL `new URL('/client/index.js', location.href).href` for the exported Symbiote APIs, and call `emit()` to send named JSON events to the agent.

Event bindings automatically expose WebMCP tools. Import `ToolDescriptor` for explicit actions, or `getActiveWebMCPTools` and `webMCPRegistry` for registration diagnostics. Initialize descriptors in `init$` before rendering and declare `deps` for conditional visibility. Connect a WebMCP consumer to the agent to discover and invoke tools. Replacement and stop remove generated components and their native tools while tabs remain open. See the [WebMCP instructions](../../../README.md#webmcp) for setup and an explicit tool example.

Browser-side integrations can import `listPageTools()` and async `executePageTool(name, input = {})` from `/client/index.js`. These forward Symbiote's public metadata and execution results, including `isError` responses, without requiring native WebMCP. Validate inputs against the discovered schemas before invocation. Tool availability follows Symbiote's visibility and component lifecycle.

One direct JSON script initializes local state before binding setup. Named context-providers mirror local and shared fields in both directions; anonymous providers expose local fields to descendant `^` bindings. Use one provider per named context. Each insertion resets provider-owned contexts and removes subscriptions from the replaced components.

For command examples and markup syntax, see [Markup, RAT, and interactivity](../../../README.md#markup-rat-and-interactivity).
