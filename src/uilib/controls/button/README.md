# Button with loading state

`agui-button` adds a shared preloader and attribute forwarding around a native button. Use ordinary native buttons with HTML-app action descriptors for declarative state changes; the shared button styles apply to both.

```html
<button type="button" bind="onclick: [toggle]UI/showModal">Toggle modal</button>
<button type="button" value="settings" bind="onclick: [set]UI/section">Settings</button>
<agui-button bind="$.loading: UI/pending" type="submit" form="editor">
  <agui-icon name="save"></agui-icon>Save
</agui-button>
```

The native type defaults to `button`. Additional host attributes forward to it, including IDs, classes, styles, accessible names, disabled state, form attributes, and popover invokers. Symbiote binding/layout attributes and loading configuration remain on the host. A supplied ID identifies the native button, without creating another layout box or duplicate ID. Caller-provided native attribute bindings and later attribute changes also forward.

Boolean `loading` or `$.loading` replaces direct child icons with the shared preloader, retains the label, and sets `aria-busy`. An explicit property value takes precedence over the attribute. Loading blocks clicks, handlers, form submission, popover activation, and the scoped `activate` tool without changing caller-owned disabled state. The application owns loading completion. Disabled, read-only, and aria-disabled buttons also reject activation.

The `activate` tool clicks the actual button and returns `{ activated: true }`; it does not implement state mutation, saving, or feedback. Discover it by `ownerName="agui-button"` and the native button ID in its component description. Native HTML-app actions expose their own event tools. Removal releases tools, observers, listeners, and inherited HTML-app bindings. Viewer snapshots remain inert.
