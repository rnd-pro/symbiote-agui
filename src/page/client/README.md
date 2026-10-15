# Browser components

JSDA bundles `index.js` at `/client/index.js` when the session page loads. Import that URL through CDP to access `AguiComponent`, `ContextProvider`, and Symbiote's `Symbiote`, `PubSub`, `html`, and `css` exports. Browser code is checked by `tsconfig.browser.json`; Node runtime code remains directly executable.

`agui-component` processes inline RAT markup and accepts DOM templates through `use-template`. Unknown custom tags using that attribute receive their own generic component class. Definitions persist for the page lifetime; each insertion supplies new instances and resolves templates from its own markup. Keep custom behavior in registered subclasses or DOM/CDP callbacks.

One direct JSON script initializes a component's local state before binding setup. An explicit `ctx` makes a context-provider own a named context. Its local fields and shared fields stay synchronized in both directions. Anonymous providers expose local fields to descendant `^` bindings.

Validate JSON and template references before replacing content. Named providers declared in the fragment are seeded before consumers connect. Providers cloned from templates initialize and track their contexts when mounted. Cleanup compares context identity so a removed provider cannot delete a replacement's state. Subscriptions are removed by Symbiote's component lifecycle.
