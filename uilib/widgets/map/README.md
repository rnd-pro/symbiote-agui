# Declarative maps

Use `agui-map` with prepared location records. Leaflet JavaScript, CSS, and local assets load automatically when the first map initializes, sharing one loading promise across instances. Pages without maps and inert viewers do not fetch those dependencies. No session imports or initialization scripts are needed.

## Data and viewport

- Bind `rows`, `value` (selected ID array), `view: { center: [latitude, longitude], zoom }`, caller-owned `texts`, and optional `tiles`. Attributes `id-key`, `latitude-key`, `longitude-key`, and `label-key` default to `id`, `latitude`, `longitude`, and `label`. Supply `label` and an optional `description`.
- Up to 500 records require unique nonempty string IDs, limited to 128 characters. Coordinates must be finite numbers: latitude within +/-85.05112878 (Web Mercator), longitude within +/-180. Invalid coordinates are skipped and counted separately; duplicate/invalid IDs reject the dataset. Zero is valid. Labels and popups render as text, falling back to the record ID when no label exists.
- `selection="none|single|multiple"` defaults to `multiple`. Pair `pub-to="APP/selectedIds"` with `bind="$.value: APP/selectedIds"`. Table, map, and chart can share the same IDs. Removed or unmappable records are ignored in effective map selection without rewriting the provider.
- Pair `view-pub-to="APP/mapView"` with `bind="$.view: APP/mapView"`. The default viewport is center `[0, 0]`, zoom `2`; zoom accepts integers 0-22. Marker clicks, keyboard list controls, and tools share the selection guard. User panning/zooming publishes after movement ends; incoming assignments, resizing, initialization, and equivalent requests do not publish. Fit uses all valid records, with a maximum fitted zoom of 16.
- `disabled`, `readonly`, `loading`, and `error` accept attributes or native property bindings. Loading, invalid data, dependency/render failures, and external errors block edits. Read-only and disabled also stop pan/zoom. Tile failures retain marker/list interaction and display caller-owned status. Selection and viewport remain transient by default; this component never edits or saves source records.

## Tiles and attribution

`tiles` defaults to `null`, which renders markers without a basemap. To enable raster tiles, bind `{ url, attribution, attributionUrl?, minZoom?, maxZoom? }`. Supply a complete HTTPS URL template containing only `{z}`, `{x}`, and `{y}` placeholders. URL credentials, fragments, executable schemes, and other placeholders are rejected. Native tile zoom defaults to 0-19; outside that range Leaflet scales available tiles, within the map's 0-22 zoom range. Attribution is required plain text; an optional HTTPS attribution link stays visible below the map.

For modest interactive OpenStreetMap use, configure `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution `OpenStreetMap contributors`, and `https://www.openstreetmap.org/copyright`. Follow the [provider policy](https://operations.osmfoundation.org/policies/tiles/), including visible attribution, normal browser caching, and no bulk downloading. Choose a provider appropriate to your traffic; availability is not guaranteed. No provider is contacted until explicitly configured.

Tile images use `referrerpolicy="origin"` in both interactive pages and viewer snapshots. This sends the local or tunnel origin, without the session path or query, while leaving the page and manager `no-referrer` policies unchanged. Requests go directly from each browser to the tile provider, using its HTTP cache headers. Use only browser-safe public credentials in configured URLs: URLs are visible in markup, tools, and shared output. There is no server tile proxy, prefetch, geocoder, routing, clustering, or offline tile cache.

## Copy and tools

Supply `texts` keys `data`, `point`, `latitude`, `longitude`, `skipped`, `fit`, `zoomIn`, `zoomOut`, `loading`, `empty`, `loadFailed`, `renderFailed`, `tileFailed`, `invalidRows`, `invalidTiles`, `invalidState`, and `unavailable`. The coordinate table also uses `results`, `selected`, `selection`, `selectRow`, `selectAll`, `page`, `pagination`, `previous`, and `next`. Missing copy renders empty; external `error` supplies its own text. Reload the page to retry a dependency load failure.

Discover scoped tools by `ownerName="agui-map"` and authored ID. `set_selection` accepts `ids`, returning change/count metadata. `set_view` accepts `center` and `zoom`, returning `changed` and the applied view. `fit_records` fits valid records through the same view mutation. `read_view` returns the view, selected/skipped counts, and a page of visible marker IDs; use `offset` and `limit` (default 20, maximum 100), following `nextOffset` within 8 KiB. Mutation tools require a ready, available renderer; visible reads also work in read-only state. The internal table exposes its scoped controls, forwarding selection through the map guard.

Notifications use `map-selection-change` or `map-view-change`, with widget ID/context and counts, excluding records and full selections. Existing provider reads remain the way to inspect records.

## Lifecycle and sharing

The renderer uses the latest inputs after loading, resizes through a native observer on reveal/container changes, and disposes Leaflet, listeners, and observers on removal. Native zoom gestures and zoom buttons animate, publishing the viewport when movement ends; maps initialized with reduced motion use immediate zoom changes. Incoming viewport assignments stay immediate. `--agui-map-height` controls map height (default `22rem`). The map clips to the shared inset radius. Library tokens style markers, popup text, and surrounding controls; raster tile colors belong to the provider.

Viewers receive the user's rendered DOM, tile images, and CSS without Leaflet. A fixed coordinate space inside a scalable SVG `foreignObject` preserves the original tile/marker/popup alignment and pan/zoom at different viewer widths. Controls stay inert; viewers cannot explore independently. Review actual tile availability on local/tunnel origins, keyboard ergonomics, theme, hidden-tab reveal, and narrow viewer output manually.
