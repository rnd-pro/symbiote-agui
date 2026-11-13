# Context provider data sources

`context-provider` exposes local fields through native `^property` bindings. Adding `ctx="DATA"` also mirrors those fields into the named `DATA` context. It supports inline JSON, an incoming object through `state`, or external JSON through `src`.

```html
<context-provider ctx="DATA" src="./_assets/data.json">
  <h2>{{DATA/title}}</h2>
</context-provider>
```

The response must be a JSON object with plain local state keys. Arrays, primitives, context-routing keys, and prototype keys are rejected. Nested JSON values are retained as data. `src`, `attribute-src`, `state`, `sourceLoading`, and `sourceError` are reserved controls and cannot be supplied by fetched JSON.

## Loading and precedence

- A defined bound `state` object takes precedence and suppresses JSON loading. Setting `state` to `undefined` resumes the configured source.
- Inline JSON keys override fetched defaults using their current values. This retains local edits and committed values restored into the inline declaration. Use inline JSON for intentional overrides and persistence declarations; leave source-owned fields out of it when their remote values should be loaded.
- Changing `src` cancels the previous request and replaces source-owned fields when the new JSON succeeds. Removed fields are cleared; unrelated local fields remain. Until success, the last data stays available. Clearing the source cancels loading and retains the last data.
- HTTP(S), relative URLs, CORS, and the existing configured public-source proxy are supported. Credentials and referrers are omitted. Requests have a 15-second deadline and a 1 MiB UTF-8 limit. Disconnecting cancels pending work. Remove and restore the source to retry a failed request.

Literal `src` attributes and native `$.src` bindings work. A defined state value takes precedence over the attribute. Boolean `sourceLoading` and string `sourceError` are reactive outputs for application-owned feedback; no messages or presentation are added. Error codes are `invalidSrc`, `fetchFailed`, `inputTooLarge`, and `invalidData`.

```html
<context-provider ctx="DATA" bind="$.src: APP/dataUrl"
  pub-map="APP/loading: sourceLoading; APP/loadError: sourceError">
  <h2>{{DATA/title}}</h2>
</context-provider>
```

## Editing and saving

Both `state` and fetched JSON use the same object-state validation and replacement path. Pair `bind="state: APP/model"` with `pub-to="APP/model"` for edits to that incoming object. A source-backed provider can also use `pub-to` to publish subsequent local edits as fresh objects. Incoming loads and replacements do not echo through `pub-to`; `pub-map` remains a reactive publication mechanism.

Fetching JSON does not save locally, submit feedback, or write to the source URL. External fields do not extend the server's persistence declarations. Persist editable objects on the main application provider and use the standard data toolbar; retain actual source and saving rules in the session description.
