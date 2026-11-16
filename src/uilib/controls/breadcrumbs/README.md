# Breadcrumbs

`agui-breadcrumbs` shows an ordered ancestor trail with chevron separators. It reuses `agui-nav` selection, guards and scoped tools.

```html
<agui-breadcrumbs label="Document location" pub-to="APP/navigation"
  bind="$.items: APP/ancestors; $.value: APP/location"></agui-breadcrumbs>
```

- `items` is an ordered array of `{value, label, icon?, disabled?}`. Values must be unique nonempty strings; they are opaque identifiers, not interpreted URLs or filesystem paths.
- `value` identifies the current location. Without a value, the final item is current. The current item has `aria-current="location"`; long labels wrap.
- Activating another item publishes its value through `pub-to`. Incoming bindings do not publish. The host handles navigation and supplies the updated ancestor trail and current value.
- Supply the navigation label through `label`, `aria-label` or `aria-labelledby`. `disabled` and `readonly` block activation. Discover inherited `set_value` and `read_value` tools by owner `agui-breadcrumbs`.
