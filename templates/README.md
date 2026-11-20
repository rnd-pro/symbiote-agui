# App templates

Templates are editable app starters composed from the UI library and Symbiote HTML-app. Each has an HTML entry, JSON defaults, a configuration schema in `template.json`, and owned files under `assets/`. They contain no application JavaScript or separate rendering runtime.

The Node-side catalog in `src/templates/` discovers packaged template directories by ID. IDs use lowercase letters, numbers, and hyphens, beginning with a letter. Discovery returns summaries; loading provides the descriptor, defaults, markup, and asset directory. Rendering validates configuration and returns ordinary markup for the existing AGUI host; it does not save files, start sessions, or configure external access.

## Workspace configuration

The `workspace` starter uses these native contexts:

- `APP`: `title`, optional `footer`, `noteLabel`, `inspectorLabel`, and initial `theme` (`system`, `light`, or `dark`).
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

Use `assets/content.html` as the main customization point. Its note editor publishes to `DATA/note`. `assets/inspector.html` supplies Clear and Close actions through native bindings. The header button toggles the controls sidebar. Replace these chunks with reviewed HTML while retaining or deliberately revising their bindings. Copy the assets into the saved session's owned asset directory; their runtime URLs use AGUI's `_assets` route.

Values are written into inert JSON scripts, never interpolated into HTML or binding declarations. A context's configured initial state survives section navigation; there is no automatic saving or external data access, and reload restores the authored defaults. The app header and footer stay within the viewport's scroll region. Add the actual purpose, data sources, and saving rules to the resulting session description before presenting it as ready.
