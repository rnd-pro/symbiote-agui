# Declarative table

Use `agui-table` with provider-bound `rows`, `columns`, and `texts`. Records remain authoritative in the provider. `value` is a separate array of selected string IDs, including in single-selection mode. Compose with independent [agui-filter](../filter/README.md) when filtering is needed; the skill contains a complete HTML-only example.

## Inputs

- Host attributes: `label`, `id-key` (default `id`), `selection="none|single|multiple"` (default `none`), `page-size` (default 20), `locale`, `disabled`, `readonly`, `loading`, and `error`. Native property names are camelCase where applicable. `label` names both the table and its keyboard-focusable scroll region. Locale defaults to the document or browser language.
- Reactive inputs: full source `rows`, `columns`, `texts`, `value`, optional `filteredIds`, `sort`, and local `page`. Use native property bindings or `state`; do not supply per-table JSON or executable formatters. The table does not own query/filter state or render filter controls.
- `filteredIds` is `null` by default (all source records), or an array of unique string IDs (`[]` for none). Unknown/stale IDs are ignored. The mask preserves source order; it does not discard source records or selection. Bind it to a filter's matching-ID output.
- Every row requires a unique nonempty string ID, at most 128 characters. Up to 5,000 rows and 24 columns are supported. Flat column keys start with an ASCII letter or underscore, followed by letters, digits, underscores, or hyphens; maximum length is 64.
- Columns declare `key`, caller-owned `label`, `type`, optional `sortable`, and optional `options`. Types are `text`, `number`, `date`, `boolean`, and `status`. Numbers must be finite numbers. Dates accept ISO calendar dates or timestamps with seconds and an explicit timezone. Invalid/null typed values display empty and sort last in either direction. Equal sort values retain source order. Shared descriptors can also contain filter settings, which the table ignores.
- Options are `{ value, label, disabled?, tone? }`, with status tones `info`, `success`, `warning`, or `danger`. All record content renders as text.
- `sort` is `null` or `{ key, direction: "ascending" | "descending" }`. Header buttons cycle ascending, descending, then source order. Only the sorted header has `aria-sort`.
- Page sizes range from 1 to 100. Changed result IDs and user sorting reset the local page to 1 without publishing a page correction. Incoming page/data changes clamp the effective page. Pagination is local, without server queries or virtualization.

## Text and state boundaries

Supply `texts` keys `results`, `selected`, `selection`, `selectRow`, `selectAll`, `page`, `pagination`, `previous`, `next`, `trueLabel`, `falseLabel`, `empty`, `loading`, `invalidRows`, `invalidColumns`, `invalidState`, and `unavailable`. `selectRow` is followed by the record ID. Column labels name sort buttons. Missing copy renders empty; `error` supplies external error text directly.

Pair `value` with `pub-to` and `sort` with `sort-pub-to`. Initialization, incoming replacements, and effective selection/page fallback do not publish. User edits publish fresh arrays/objects; equivalent selection sets are no-ops. Removed IDs remain untouched in the provider but are ignored by effective selection. Select-all includes every matching row across pages, preserving selected IDs outside the result. Keep selection and view settings transient unless explicitly required otherwise.

Click a row or focus it and press Space/Enter to select it. Multiple selection toggles that row without clearing other IDs; single selection replaces the previous ID and keeps an already selected row selected. Row interactions and the existing checkbox/radio controls publish through the same `pub-to` target, always as an ID array. Links, embedded controls, and text selection do not activate the row. `selection="none"` leaves rows inert. Selected rows expose `aria-selected`; keyboard focus and selected state use shared theme colors.

Disabled/read-only, loading, external errors, and invalid input block mutations. Invalid records/configuration show caller-owned error text. Closing a dialog or switching tabs does not commit table state. The table does not edit records or perform external writes.

## Tools and viewers

Discover tools by `ownerName="agui-table"` and the authored ID in component context. Actions are `set_selection` (`ids`), `set_sort` (`sort`), `set_page` (`page`), `previous_page`, and `next_page`. Mutations return `changed`, counts, and effective page, without records or selection arrays. Item tools provide column sorting, filtered selection, and per-row `set_selected`; component context identifies the table and column/record.

`read_view` returns visible-page formatted cells and `read_selection` returns effective IDs. Both accept `offset` and `limit` (default 20, maximum 100), return `items` and `nextOffset`, and stay within 8 KiB. A row too large for one result returns its ID, selected flag, and `truncated: true`; inspect its source through normal provider reads. Neither tool returns unrelated record fields.

Table changes emit bounded `agui:action` notifications with `action: "table-change"`, changed `property`, `selectedCount`, and `filteredCount`. Discover tools again when structure or availability changes.

Keyed Itemize hosts render native rows, headers, and cells with transparent wrappers. Snapshot capture unwraps structural hosts before serialization to preserve table parsing. Viewers receive inert native tables and form values without initializing components. Summaries and pagination occupy separate rows. Review theme, horizontal scrolling, keyboard controls, and small layouts manually. Customize `--agui-table-height` for the scroll region.
