# Explorer

`agui-explorer` renders caller-owned hierarchy data. It reuses `agui-list` selection, Itemize rendering, shared styles and scoped tools. It does not read folders, fetch URLs or interpret file paths.

```html
<sym-context ctx="TREE">
  <script type="application/json">
    {
      "items": [
        {"id":"documents","label":"Documents","branch":true},
        {"id":"brief","label":"Brief.md","parentId":"documents"}
      ],
      "selected": [],
      "expanded": [],
      "texts": {"empty":"No entries.","invalidRows":"Invalid hierarchy.","invalidState":"Invalid state.","unavailable":"Entry unavailable.","expand":"Expand","collapse":"Collapse","select":"Select","more":"More","retry":"Retry"}
    }
  </script>
  <agui-explorer label="Documents" pub-to="TREE/selected" expanded-pub-to="TREE/expanded"
    bind="$.items: TREE/items; $.value: TREE/selected; $.expanded: TREE/expanded; $.texts: TREE/texts"></agui-explorer>
</sym-context>
```

Each node has a unique string `id`, caller-owned `label`, optional `parentId`, and boolean `branch`. Omit `parentId` for a root. Parents must exist and be branches; cycles and more than 64 nesting levels are rejected. Sibling order follows the source array. The shared limits allow 5,000 nodes and IDs up to 128 characters. Optional `icon` selects a library icon; `disabled` also disables descendants.

`value` contains selected leaf IDs by default. Add `select-branches` (or bind `$.selectBranches`) to also select branches when opening or closing them. Selection defaults to `single`; `selection="multiple"` and `selection="none"` reuse the list contract. Collapse preserves descendant selection. `pub-to` publishes explicit selection, while `expanded-pub-to` publishes explicit branch changes. Incoming `items`, `value` and `expanded` bindings do not publish edits or start loading. The native `pub-map` can also map these properties.

For lazy branches, set `loaded: false`. Expanding publishes a fresh `{id, action: "expand"}` through `request-pub-to` and the `request` property. The host supplies children with matching `parentId`, sets `loaded: true`, and can set `loading`, `more` and caller-owned `message`. An expanded branch with `more: true` offers another request with `action: "more"`. A failed unloaded branch with a message offers `action: "retry"`. Supply `more` and `retry` text; the component does not execute backend code. The host owns cancellation, error reporting and stale-response checks.

Native buttons provide Tab, Enter and Space interaction. Discover `toggle_node` (`id`) and inherited `set_selection` (`ids`) by owner `agui-explorer`. Branch selection requires `select-branches`; `toggle_node` changes expansion only. Disabled/read-only/loading/error state blocks mutations. The host supplies all UI copy through `label`, node data and `texts`; tools return bounded selection/count or expansion metadata. Shared viewers receive inert snapshots without activating the widget or its requests.
