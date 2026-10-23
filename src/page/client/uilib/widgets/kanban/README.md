# Declarative Kanban

Use `agui-kanban` as a status editor for provider records. Bind `value` to the full records array and pair it with `pub-to`. Bind `columns` and caller-owned `texts` from a common provider. The skill contains an HTML-only example; no imports, move handlers, or drag-and-drop library are needed.

## Inputs and records

- Host attributes: `label`, `id-key` (default `id`), `status-key` (default `status`), `title-key` (default `title`), optional `description-key`, `disabled`, `readonly`, `loading`, and `error`. Native property names are camelCase. `label` names the keyboard-focusable board region and tool context.
- Reactive inputs are `value`, `columns`, and `texts`, with native property bindings or `state`. Every record requires a unique nonempty string ID, at most 128 characters. Up to 5,000 records are supported. Field-name settings are limited to 64 characters; the status key must differ from the ID key.
- Declare 1-24 columns as `{ value, label, disabled?, tone? }`, using unique nonempty string values (maximum 128 characters) and caller-owned nonempty labels (maximum 2,048 characters). Empty string is reserved for unassigned-group reads. Optional tones are `info`, `success`, `warning`, or `danger`. Disabled columns remain visible but cannot receive moves.
- Missing or unsupported statuses stay in an additional unassigned group without rewriting their source records. They can move to any enabled declared column. The unassigned group appears only when needed; declared empty columns remain visible.
- Titles and optional descriptions render string, finite number, and boolean values as text. Zero and false are preserved. Missing/empty titles use caller-provided `texts.untitled`; descriptions are omitted when empty. HTML, arbitrary formatters, card editing and record reordering are outside this contract. Dragging changes status only.

## Edits and persistence

Native card dragging, keyboard moves, and tools share the same validated edit path. Each real change creates a new records array, copies only the changed record, and preserves source order and all unrelated fields. Equivalent moves are no-ops. Invalid IDs/destinations, disabled columns, disabled/read-only/loading/error states, and invalid input block mutations. Incoming record/configuration updates never publish or emit edit actions. Focus follows dragged or keyboard-moved cards; tool calls do not move focus. Focus a card and press Alt+Left/Right to move through enabled columns in the layout's reading direction. Unknown/disabled current statuses move to the first/last enabled column. Moves stop at the ends. Escape or data/configuration changes cancel an active drag. Only drags originating on the same board can be dropped; disabled and unassigned groups reject drops.

Bind a table's `rows` to the same provider records for a synchronized view. Keep table selection in a separate ID array. A move is a local draft: declare the records key in the provider's `persist` and use the common data toolbar for Save/Cancel. No additional Save handler or feedback call is required, and moving a card does not perform an external write. Filtering a separate view does not hide board cards.

## Texts, tools, and viewers

Supply `texts` keys `items`, `moveHint`, `unassigned`, `untitled`, `empty`, `emptyColumn`, `loading`, `invalidRows`, `invalidColumns`, `invalidState`, and `unavailable`. Labels, status choices, empty/error copy, and accessible names stay caller-owned. `error` provides external error text directly. Supply `moveHint` with drag/keyboard instructions; it appears above the board and describes focusable cards. Missing copy renders empty.

Discover board tools by `ownerName="agui-kanban"` and the authored ID in component context:

- `move_item` accepts `id` and destination `status`.
- `read_view` accepts optional `status`, `offset`, and `limit` (default 20, maximum 100). Omit status for all records; use an empty string for unassigned cards. Reads return only `id`, `title`, `description`, `status`, and `unassigned`, with `nextOffset`, counts, and an 8 KiB limit. Oversized cards return their ID and `truncated: true`; inspect source fields through normal provider reads. Loading/error states return no cards.

Each `agui-kanban-card` exposes `set_status` with a `status` argument. Its component context identifies the board and record. Mutations return only `changed`, `recordId`, applied `status`, and `totalCount`. Notifications use `action: "kanban-change"`, record ID, status, and count, without records. Rediscover after moves or availability changes; native Itemize disposes removed card subscriptions and tools.

Viewers receive inert rendered columns and cards without initializing board components. Counters precede column labels. Columns have equal height, with content aligned to the top, and wrap or stack with available width; customize `--agui-kanban-column-width` for their preferred minimum width. Review appearance, keyboard ergonomics, and narrow screens manually. Native drag support on touch devices depends on the browser; keyboard and scoped tool moves remain available.
