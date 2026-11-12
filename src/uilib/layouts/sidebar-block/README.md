# Sidebar control groups

`agui-sidebar-block` groups related sidebar controls with a small uppercase label, compact vertical padding and a horizontal divider. Place blocks in a `grid gap-2` container. Its content uses a grid; add an `agui-toolbar` inside when controls belong in one row.

```html
<agui-sidebar-block label="Filters">
  <agui-field label="Search" type="search" pub-to="APP/query"
    bind="$.value: APP/query"></agui-field>
</agui-sidebar-block>

<agui-sidebar-block label="Selected item" bind="$.active: APP/hasSelection">
  <agui-button set="APP/detailsOpen" value="true">Details</agui-button>
</agui-sidebar-block>
```

- Active is the default. Set `active="false"` for an inactive placeholder, `active="true"` (or an empty `active` attribute) for an expanded group, or bind a boolean to `$.active`. A property binding takes precedence over the attribute.
- Inactive blocks show only the faded label. Contents stay mounted, hidden and inert, with native fieldset disabling. Drafts and each control's own disabled/read-only settings survive reactivation. If focus is inside when a block becomes inactive, it moves to the label.
- Supply `label` or bind `$.label`. There is no built-in copy, disclosure button, automatic saving or outgoing edit. The application owns applicability; use an existing control to change that state when needed.
- Authored children use native Symbiote projection and bindings. There are no remaining light DOM slots or nested panel surfaces.

This is a presentation group, not backend authorization. Keep action validation and access checks with the action itself. Review spacing, label fading and narrow sidebars manually.
