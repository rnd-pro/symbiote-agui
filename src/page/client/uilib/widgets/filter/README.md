# Declarative filter

Use `agui-filter` to derive matching record IDs without coupling filtering to a particular view. Bind full source `rows`, typed `fields`, caller-owned `texts`, a `value` dictionary, and optional `query`. The skill includes a complete composition with `agui-table`; other views can consume the same ID output.

## Inputs and outputs

- Host attributes: `label` (tool context), `id-key` (default `id`), `locale` (document/browser default), `disabled`, `readonly`, `loading`, and `error`. Native property names are camelCase where applicable. Use native bindings or `state`; no per-widget JSON or executable formatters.
- Every record requires a unique nonempty string ID, at most 128 characters. Up to 5,000 records and 24 fields are supported. Flat field keys start with an ASCII letter or underscore, followed by letters, digits, underscores, or hyphens; maximum length is 64.
- Fields declare `key`, caller-owned `label`, `type`, and optional `filter`/`options`. Types are `text`, `number`, `date`, `boolean`, and `status`. Numbers must be finite numbers; dates must be ISO calendar dates or timestamps with seconds and an explicit timezone. Invalid/null typed values do not match active predicates.
- Text supports `filter: "contains"`. Number/date fields support `filter: "range"` with inclusive bounds; an upper calendar date includes its full day. Boolean equality uses strings `"true"` and `"false"`. Text/status equality requires `options: [{ value, label, disabled?, tone? }]`; the empty value is reserved for clearing. Status tones are `info`, `success`, `warning`, or `danger`.
- `value` maps field keys to strings or `{ min?, max? }`; numeric bounds are numbers and date bounds are ISO strings. Omit cleared predicates or use empty text/empty bounds. Predicates combine with AND. Query searches displayed field text using the configured locale. Query and text values are limited to 2,048 characters.
- Pair `value` with `pub-to`, and optionally `query` with `query-pub-to`. These targets publish fresh values only for user/tool edits. Initialization, incoming assignments, and repeated equivalent values emit no actions or edit publications.
- Set `results-to="APP/matchingIds"` to an existing provider array. This explicitly derived output updates on initialization, edits, and incoming data/query/configuration changes, without announcing an edit. Local `resultIds` exposes the same IDs in source order. Do not bind the source rows back to this output. Invalid input, loading, and external errors produce an empty result; disabled/read-only still recomputes incoming data but blocks edits.

The same descriptors can be used as table columns, with optional `sortable` ignored by the filter. Bind a table to full source records and `filteredIds` to these matching IDs so selections outside the result survive. The filter never edits records or performs external writes.

## Copy, tools, and layout

Supply `texts` keys `search`, `all`, `minimum`, `maximum`, `trueLabel`, `falseLabel`, `empty`, `loading`, `invalidRows`, `invalidFields`, `invalidState`, and `unavailable`. Field labels name controls; `error` supplies external error text directly. Missing copy renders empty.

Discover tools by `ownerName="agui-filter"` and authored ID: `set_value` (`value`), `set_query` (`query`), and `read_result`. Internal `agui-filter-field` controls expose `set_filter` (`value`), with `filterId`, `field`, and `label` in their component context. All mutations share validation and availability guards, returning only `changed` and `resultCount`. Notifications use `action: "filter-change"`, changed `property`, and `resultCount`, without records or full filter values.

`read_result` returns matching IDs as `items`, `total`, and `nextOffset`. It accepts `offset` and `limit` (default 20, maximum 100) and stays within 8 KiB. Discover tools again when structure or availability changes. Viewers receive inert form values without initializing filtering behavior.

Query and field blocks stack independently. Range labels and inputs use their own vertical groups. Keep different total heights out of common toolbars and rows; include labels, hints, and errors when comparing blocks. Review appearance, keyboard use, and narrow screens manually.
