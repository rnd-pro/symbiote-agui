# Declarative list

Use `agui-list` to render provider-bound records with Symbiote's default Itemize processor. AGUI supplies no item component, item wrapper, selection control, role, or item styling. Native Itemize owns its transparent item scopes; the supplied template defines their contents.

```html
<agui-list label="Records" selection="multiple" pub-to="APP/selectedIds" class="grid gap-4"
  bind="$.items: APP/items; $.value: APP/selectedIds; $.filteredIds: APP/matchingIds; $.texts: APP/listTexts">
  <template>
    <agui-panel process-inner-html="false" role="listitem" class="grid gap-2">
      <h3>{{name}}</h3>
      <button type="button" bind="onclick: ^selectItem; ariaPressed: _selected; disabled: _selectionDisabled">Select</button>
    </agui-panel>
  </template>
</agui-list>
```

- Bind `items`, `value`, optional `filteredIds`, and caller-owned `texts`. Every item needs a unique nonempty string ID; `id-key` defaults to `id`. Shared limits allow 5,000 items and IDs up to 128 characters.
- Provide a direct child `<template>` or `item-template="#existing-template"`. The template is chosen at initialization; replace the list to use a different template. The list places that template directly in its Itemize container without slots or an intermediate renderer. Native Itemize updates existing item owners by position; keep durable values in a provider.
- Item state contains the record's flat fields plus reserved boolean `_selected` and `_selectionDisabled`. Set `process-inner-html="false"` on nested layouts to skip their extra parsing pass and bind item fields locally, as above. Layouts that parse their own children use `^name` to reach item fields. Normal fields such as `selected` retain their application values. Use text bindings for external content.
- `selection="none|single|multiple"` defaults to none. `value` is always an ID array. Pair `bind="$.value: APP/selectedIds"` with `pub-to="APP/selectedIds"` for synchronization. Incoming assignments and initialization do not publish; equivalent selection sets are no-ops. Removed IDs are ignored without rewriting the provider.
- One delegated click handler selects an item's noninteractive content. Multiple selection toggles; single selection keeps the clicked item selected. Links, controls, summaries, and text selection keep their native behavior. No automatic focus target or keyboard handler is added to items.
- Controls are optional and authored in the item template. Bind a native button's `onclick` to `^selectItem` for standard keyboard activation. A checkbox/radio can use `bind="checked: _selected; disabled: _selectionDisabled; onchange: ^selectItem"`; its checked state determines selection. The same change binding works on an authored `agui-field` checkbox. Supply labels, radio groups, selected styling, and roles in the template. Popup binding and delegated handling never process one click twice.
- Bind `filteredIds` to an independent filter's `results-to` array. `null` shows all records; `[]` shows none. Unknown IDs are ignored, source order is retained, and filtering preserves selections outside the result. The list does not edit, sort, or paginate records.
- Supply `label` for the list's accessible name, and `texts` keys `empty`, `loading`, `invalidRows`, `invalidState`, and `unavailable`. `error` accepts external error text. Disabled/read-only, loading, and invalid input block selection; authored controls can bind `_selectionDisabled`. Loading/errors clear rendered items. The host exposes `data-state="ready|loading|empty|error"`, `data-message`, and `aria-busy`. Nonempty messages appear through `::before`; supply richer feedback and live announcements in application markup when needed.
- Set layout with ordinary `class` or `style` on `agui-list`, for example `class="grid gap-4 md:grid-cols-2"`. Its Itemize container uses `display: contents`. Set gaps and item appearance yourself. Use one authored root to group a card, or multiple roots when desired. Review semantics, keyboard access, and appearance for the chosen template.

Discover `set_selection` by owner `agui-list` and authored ID. It accepts `ids` and returns bounded `changed`, `selectedCount`, and `filteredCount`. Template popup handlers use native Symbiote tool discovery and Itemize identities. Successful edits emit `agui:action` metadata with `action: "list-change"`, `property: "value"`, and counts, without records or selections. Viewer snapshots contain the rendered template and authored controls inertly.
