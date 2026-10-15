# Browser runtime

JSDA bundles `index.js` at `/client/index.js`. The entry registers AGUI components and connects the native WebSocket client using the token in the session URL fragment. The page runtime applies render/state requests and acknowledges success or errors. Reconnection and reload restore the worker's latest markup with initial component state.

`render.js` validates a fragment and loads its stylesheet before replacing the content root. `modules.js` loads marked inline modules before mounting for class registration, invokes their default exports after mounting, and calls their cleanup functions on replacement or graceful stop. Unmarked executable scripts remain inert. Modules may import the fully resolved URL `new URL('/client/index.js', location.href).href` to use the exported Symbiote APIs and call `emit()` to send named JSON events to the agent.

`agui-component` accepts inline RAT markup and `use-template` DOM templates. Unknown custom tags using that attribute receive generic component classes. Register custom subclasses through Symbiote's `reg()` so WebMCP receives their tag identity. Definitions persist for the page lifetime; each insertion supplies fresh instances and templates.

The entry imports Symbiote's WebMCP extension and enables automatic tools from event bindings. It re-exports `ToolDescriptor`, `getActiveWebMCPTools`, and `webMCPRegistry` for generated modules. Initialize descriptors in `init$` before rendering and declare `deps` for conditional visibility. Unsupported browsers keep the regular UI and WebSocket workflow; registry entries expose `nativeActive` for diagnostics. Replacement and graceful stop remove generated components and their native tools, while tabs remain open. See the root [WebMCP instructions](../../../README.md#webmcp) for browser setup and an explicit tool example.

One direct JSON script initializes local state before binding setup. Named context-providers mirror local and shared fields in both directions; anonymous providers expose local fields to descendant `^` bindings. Named contexts are seeded before consumers connect. Cleanup compares context identity so removed providers cannot affect replacements, and Symbiote releases component subscriptions.

Browser code is checked separately without Node globals. Shared fragment analysis and transport types are reused by the server; Node runtime code remains directly executable.
