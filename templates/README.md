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

Complete the generated session description with its purpose, actual data sources, and saving rules before presenting it as ready. Configure feedback or the accepted fallback using the existing AGUI workflow. Starter creation does not establish external access or synchronization.

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

Use `content.html` in the created asset directory as the main customization point. Its note editor publishes to `DATA/note`. `inspector.html` supplies Clear and Close actions through native bindings. The header button toggles the controls sidebar. Replace these chunks with reviewed HTML while retaining or deliberately revising their bindings. Use the existing asset commands to add or replace files; their runtime URLs use AGUI's `_assets` route. Edit the saved HTML and use `sync` to reload changes in a running session while respecting existing draft protections.

Values are written into inert JSON scripts, never interpolated into HTML or binding declarations. A context's configured initial state survives section navigation; there is no automatic saving or external data access, and reload restores the authored defaults. The app header and footer stay within the viewport's scroll region. Add the actual purpose, data sources, and saving rules to the resulting session description before presenting it as ready.
