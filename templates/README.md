# App templates

Templates are editable app starters composed from the UI library and Symbiote HTML-app. Each has an HTML entry, JSON defaults, a configuration schema in `template.json`, a Markdown description, and owned files under `assets/`. They contain no application JavaScript or separate rendering runtime.

Discover a starter, inspect its contract, then create a saved AGUI:

```sh
npx symbiote-agui templates list --query workspace
npx symbiote-agui templates describe workspace
npx symbiote-agui templates create workspace my-workspace --config ./app-config.json
npx symbiote-agui start my-workspace
```

Omit `--config` to use the defaults. `list` returns concise summaries; `describe` returns the configuration schema, defaults, description, and asset names without the source HTML. Template IDs use lowercase letters, numbers, and hyphens, beginning with a letter.

Creation uses the current project folder or Default cache, remembers that project in the manager, and returns saved paths and the next command. It copies the starter assets, records the template ID and package version in session metadata, and leaves the session stopped. Existing sessions, saved artifacts, and conflicting names are rejected. Creation never replaces an existing definition. Later package updates do not rewrite created apps.

Available starters are `workspace`, `collection`, and `dashboard`. Configuration contracts returned by `describe` include only their referenced shared JSON Schema definitions. Widget inputs are also checked by the library's native models before any files are created.

Choose Workspace for custom imported content, Collection for filtering and reviewing records, or Dashboard for prepared metrics and visualizations. The UI library gallery's Templates section compares screenshots of the actual starters and provides downloadable JSON examples. Preview records are illustrative, separate from the empty creation defaults; use the established task's actual data when configuring an app.

Each starter includes its imported chunks' compiled layout utilities in the owned `styles.css` asset. Keep that file with the chunks when copying or moving the app; component appearance continues to use the shared library styles and tokens.

All starters pair the day/night toggle with the palette selector. `APP/theme`, `APP/palette`, and `APP/paletteTexts` configure their initial appearance and palette labels; choices remain transient until the app supplies saving behavior.

Complete the generated session description with its purpose, actual data sources, and saving rules before presenting it as ready. Configure feedback or the accepted fallback using the existing AGUI workflow. Starter creation does not establish external access or synchronization.

## Workspace configuration

The `workspace` starter uses these native contexts:

- `APP`: `title`, optional `footer`, `noteLabel`, `inspectorLabel`, initial `theme` (`system`, `light`, or `dark`), `palette`, and `paletteTexts`.
- `UI`: initial `inspectorOpen`. Section loading, error, and icon signals are maintained by `sym-import` and navigation.
- `DATA`: initial `note`, shared between the content editor and sidebar controls.
- `ROUTER`: `routes`, the single native map driving navigation, header title, and imported section URL.

Configuration is a JSON object keyed by context. Omitted contexts and fields retain their defaults. Supplied fields replace values shallowly: a supplied `routes` object replaces the whole default map. Unknown contexts, fields, and invalid values are rejected. The packaged descriptor is the authoritative field/schema reference.

For example:

```json
{
  "APP": {
    "title": "Research workspace",
    "noteLabel": "Working notes",
    "theme": "light"
  },
  "DATA": {
    "note": ""
  }
}
```

Each route needs a title and an HTML asset `src`, with one route marked `default: true`. Optional icons use the supported library collection. Sources use `./_assets/<path>.html` or `.htm`; remote URLs, traversal, and encoded paths are rejected. Custom referenced chunks must be supplied through the existing session asset workflow before opening that route.

Use `content.html` in the created asset directory as the main customization point. Its note editor publishes to `DATA/note`. `inspector.html` supplies Clear and Close actions through native bindings. The header button toggles the controls sidebar. Replace these chunks with reviewed HTML while retaining or deliberately revising their bindings. Use the existing asset commands to add or replace files; their runtime URLs use AGUI's `_assets` route. Edit the saved HTML and use `sync` to reload changes in a running session while respecting existing draft protections.

Values are written into inert JSON scripts, never interpolated into HTML or binding declarations. A context's configured initial state survives section navigation; there is no automatic saving or external data access, and reload restores the authored defaults. The app header and footer stay within the viewport's scroll region. Add the actual purpose, data sources, and saving rules to the resulting session description before presenting it as ready.

## Collection configuration

The `collection` starter provides sidebar filters, table/card tabs, a selection-controls sidebar, and a dialog for selected records. Both views consume the same filter results and selection; filtering preserves selections outside the current results.

- `APP`: app title, footer, theme, palette and palette labels, record/filter/details labels, and shared field/table/list copy in `texts`.
- `DATA/records`: records with unique `id` and `title`. Optional `status` and `description` supply card and dialog text. Other fields can drive configured columns and filters.
- `DATA/columns`: native table/filter field definitions, including supported types, sorting, filters, and options. See the [table](../uilib/widgets/table/README.md) and [filter](../uilib/widgets/filter/README.md) contracts.
- `UI`: initial `view` (`table` or `cards`), `selectionMode` (`single` or `multiple`), `selectedIds`, `query`, and `filters`. Filter results, sorting, effective selection count, and dialog state are managed through native bindings. Changing selection mode clears selection.
- `ROUTER/routes`: the same route contract as Workspace; its default chunk is `records.html`.

Replace `records.html` to change the item template, details presentation, or controls. The starter does not edit records or save UI preferences. Theme and palette controls apply immediately; reload restores their configured defaults.

## Dashboard configuration

The `dashboard` starter renders prepared metric cards and optional chart/map regions. Its sidebar controls those regions, which are removed from the DOM while disabled. Enabling a region initializes its existing lazy widget; no chart or map dependencies load for disabled regions.

- `APP`: app title, footer, theme, palette and palette labels, chart label/type/X label, map label, empty-metrics copy, and native `chartTexts`/`mapTexts` dictionaries.
- `DATA/metrics`: unique `id`, `label`, and a prepared string or number `value`. Metrics use native Itemize; the starter does not calculate aggregates.
- `DATA/chartRows` and `DATA/chartSeries`: native [chart inputs](../uilib/widgets/chart/README.md), using record fields `id` and `label` plus series value fields.
- `DATA/mapRows` and `DATA/mapTiles`: native [map inputs](../uilib/widgets/map/README.md). Locations use `id`, `label`, `latitude`, and `longitude`. Tiles default to `null`; an explicitly configured public provider is contacted only when the map is enabled.
- `UI`: initial `chartVisible`, `mapVisible`, and `mapView`. User map movement publishes `mapView`; these choices remain transient.
- `ROUTER/routes`: the same route contract as Workspace; its default chunk is `overview.html`.

All datasets start empty, and optional regions start disabled. Supply task-specific data rather than copying preview records. Replace `overview.html` to rearrange the existing widgets. No automatic data loading, saving, feedback route, or external synchronization is configured by these starters.
