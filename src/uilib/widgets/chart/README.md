# Declarative charts

Use `agui-chart` for prepared line, bar, or donut data. Bind `rows`, `series`, caller-owned `texts`, and optionally selected IDs in `value`. The component loads its packaged ECharts SVG adapter when initialized. Concurrent instances share that load; pages without charts and inert viewers do not fetch it. No imports, CDN scripts, or engine options belong in session markup.

## Inputs

- Host attributes: `type="line|bar|donut"` (default `line`), `id-key` (default `id`), `x-key` (default `label`), required caller-owned `x-label`, optional `x-type="text|number|date"` (default `text`), `locale`, `label`, `description`, `selection="none|single|multiple"` (default `none`), `disabled`, `readonly`, `loading`, and `error`. Native property names are camelCase. Locale defaults to the document/browser language.
- Every record requires a unique nonempty string ID, up to 128 characters. Up to 500 records and 8 series are supported. Records remain authoritative in the provider; charts do not aggregate, sort, edit records, or perform external writes.
- A series declares `{ key, valueKey, label, color?, format?, currency?, digits?, unit? }`. Keys and field names are limited to 64 characters, labels/units to 2,048 characters, and series keys must be unique. Semantic colors are `accent`, `success`, `warning`, `danger`, and `muted`.
- `format` is `number` (default), `currency` (with a three-letter uppercase `currency` code), or `percent` (fractional input, so `0.25` displays as 25%). Optional `digits` is 0-6. `unit` appends caller-owned text. Cartesian series share one value scale and must use matching format, currency, and unit settings. Donut requires exactly one nonnegative series.
- Values must be finite numbers, `null`, or missing. Missing values create gaps; zero remains meaningful. Invalid numbers or negative donut values show caller-owned errors. An all-zero donut has no filled sectors. `x-type` formats labels as text, locale-aware numbers, or ISO dates in UTC; it preserves input order and does not create a continuous time axis.
- Labels and tooltips render data as text, including markup-looking strings. Arbitrary engine options, HTML formatters, custom callbacks, and executable URLs are not accepted as widget configuration.

## Selection and lifecycle

`value` is always a string ID array. Pair `pub-to="APP/selectedIds"` with `bind="$.value: APP/selectedIds"`. Clicking a plotted point or using the keyboard-accessible data table follows the same validated selection path as tools. Record IDs, rather than engine indices, preserve selection after reordering. Missing records are ignored in effective selection without rewriting provider state. Initialization, incoming changes, and equivalent selection sets emit no edit actions. Keep selection transient unless explicitly required otherwise.

The disclosure below each chart contains formatted data and native single/multiple selection controls. It reuses the library table, including pagination. Disabled/read-only, external loading/errors, invalid data, dependency loading, and renderer failures block selection. Reading valid prepared data remains available independently of renderer readiness.

The adapter initializes from the latest inputs after loading and ignores completion after removal. Native ResizeObserver handles container changes and reveal after a hidden tab. Theme tokens, system color preference, and reduced motion update the renderer. Cleanup cancels scheduled work, disconnects observers/listeners, and disposes ECharts. Failed dependency loading shows caller text; reload the page to retry. Customize `--agui-chart-height` for the plot height.

## Copy, tools, and viewers

Supply chart `texts` keys `data`, `loading`, `empty`, `loadFailed`, `renderFailed`, `invalidRows`, `invalidSeries`, `invalidState`, and `unavailable`. The data table also uses `results`, `selected`, `selection`, `selectRow`, `selectAll`, `page`, `pagination`, `previous`, and `next`. Provide the chart label, description, X label, and series labels through attributes/bindings. Missing copy renders empty; `error` supplies external error text directly.

Discover tools by `ownerName="agui-chart"` and authored ID. `set_selection` accepts `ids` and returns `changed`, `selectedCount`, and `totalCount`. `read_view` returns only formatted X/series values; `read_selection` returns effective IDs. Both accept `offset` and `limit` (default 20, maximum 100), return `items` and `nextOffset`, and stay within 8 KiB. Oversized points return their ID and `truncated: true`; inspect source fields through ordinary provider reads. Notifications use `action: "chart-change"` and counts, without records or full selections. The internal data table exposes its usual scoped controls, forwarding selection through the chart's guarded path.

Viewers receive rendered SVG, formatted data, and shared styles without running ECharts. Review actual viewer output, pointer selection, keyboard use, theme, animation, and narrow layouts manually. Representative compositions must fit the existing 1 MiB snapshot limit.
