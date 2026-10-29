# Team AGUI libraries

Keep reusable interfaces beside the tasks they support. A team library contains one `<ID>.html` definition and one `<ID>.md` description per AGUI, plus an optional `<ID>.proxy.json` source policy. These are ordinary files you can review, edit, and share through Git. Review allowed origins with the interface; the [asset proxy](./reference.md#asset-proxy) serves only configured public sources.

## Choose a folder

Run inside your team's checkout:

```sh
npx symbiote-agui config folder ./aguis
npx symbiote-agui config show
```

The folder setting is saved in `.agui.json` using a relative path. Commands discover the nearest configuration in the current directory or its parents. Include that configuration and the chosen folder in Git. No dependency or Git repository initialization is required.

You can also open Settings in the [session manager](./reference.md#session-manager) to choose the save folder. Save folder and open updates the launch project's configuration and opens the selected folder's manager. Use default cache returns to private caching without deleting the library. Existing files and live sessions remain in their original scope.

An absolute `AGUI_LIBRARY_DIR` environment variable overrides the project setting. An empty value explicitly selects private caching. `npx symbiote-agui config reset` removes the project folder setting; it does not delete interfaces or stop workers. Environment overrides remain in effect until unset.

Without a folder setting, definitions stay in the private cache under `~/.symbiote-agui/sessions/.cache/` or the selected `AGUI_STATE_DIR`. Markdown descriptions are stored beside the cached HTML.

## Revisit and transfer projects

Use Projects in the manager to connect existing AGUI folders and revisit them or Default without re-entering paths. Switch navigates to that folder's manager without changing `.agui.json` or the scope of CLI commands. Running pages, URLs, and drafts remain in their original project. Forget connection removes only the remembered connection.

Open folder requests the host's file manager. Project explorer browses the current project with read-only source and Markdown previews. Default presents saved definitions under readable session names and excludes private runtime records.

Select a saved session to Copy to project or Move to project. Choose the destination and session ID; saved data and private metadata are explicit options. Copy preserves the original, including a running page. Move requires a stopped source, verifies the destination before removing source files, and retains excluded saved artifacts in a private backup. The destination stays stopped. Review incomplete operations in Transfers; see the [transfer and recovery controls](./reference.md#session-manager) for limits and recovery behavior.

Use Rename, or `npx symbiote-agui rename <SESSION_ID> <NEW_SESSION_ID>`, to change a stopped session's ID within its current project. It retains all saved data and metadata, with the same verification and recovery as Move. The Markdown display title and embedded references remain unchanged. Review renamed definition files in your normal Git workflow.

## Discover and evolve interfaces

```sh
npx symbiote-agui list
npx symbiote-agui list --query "sales pipeline"
npx symbiote-agui describe leads
npx symbiote-agui start leads
```

`list` returns IDs, titles, summaries, and file paths without opening browsers. Search matches the ID, Markdown description, and private data-flow metadata, without case sensitivity. `describe` returns the complete description and metadata when present. Reuse a matching interface before generating a new one.

Every accepted `insert` saves its definition in the selected folder and creates a description if missing. Existing descriptions are preserved. To save a prepared definition without starting a session, or update its description:

```sh
npx symbiote-agui save leads --file ./prepared-leads.html
npx symbiote-agui describe leads --file ./leads-description.md
```

Describe the task, intended users, data sources, available actions, and persistence expectations. Keep the description current when the interface changes. `save` validates markup without executing its modules. `start`, `insert`, and `sync` render the definition and execute its marked modules in the browser.

`npx symbiote-agui save leads` keeps an existing saved definition and creates a missing description. If the selected team folder has no such definition, it imports that ID's HTML, available description, and proxy policy from your private cache while leaving the private copies intact. An existing description in the destination is preserved.

## Load team changes

Use your normal Git workflow to commit, pull, and resolve file conflicts. AGUI does not run Git commands or merge source files.

After pulling changes, start a stopped session normally. For a running session:

```sh
npx symbiote-agui sync leads
npx symbiote-agui sync all
```

`sync` reads the latest saved HTML and proxy policy and applies them without rewriting the source or description. It rebuilds styles, reruns marked modules, and refreshes tool registrations. Rediscover tools before invoking them again. Unsaved form values and `update` changes reset; explicitly committed provider data is retained when declarations remain compatible. Proxy policy follows Rename, Copy, and Move automatically, independently of saved-data and private-metadata options.

[Local data commits](./reference.md#local-data-commits) update private cached HTML under `.runtime/`, scoped to this library on this machine. They never write application records into shared source definitions. Copying HTML/Markdown through Git or importing it with `save` does not transfer those snapshots; the manager can include them explicitly during Copy or Move. Adding providers or keys preserves existing committed values; removing or renaming them, or changing a non-null top-level type, requires reconciliation. Conflicting sync fails without discarding the previous snapshot. After backing up any needed data, `npx symbiote-agui sync leads --reset-data` explicitly resets committed data to the saved source defaults. Reset applies to one running session at a time.

`sync all` targets running sessions with saved definitions in the selected storage scope. It does not open or start other sessions. Results report per-session success or failure; other sessions continue after a failure. Nothing is watched or synced in the background.

## Storage and lifecycle

Session IDs are scoped to the selected library folder. Different checkouts can use the same ID independently. Commands from another working directory that selects the same folder reach the same local sessions. Without a library, the existing per-user session scope applies.

Workers keep the folder selected at startup, even if configuration later changes. Reselect that folder to manage those workers. Runtime metadata, logs, control tokens, and tunnel processes remain in private storage under `AGUI_STATE_DIR` or `~/.symbiote-agui/sessions/`; none are written to the team folder. Public links and live state are not shared through Git.

[Data-flow metadata](./reference.md#session-data-flow-metadata) records the initial source, bindings, and intended destinations without editing the Markdown description. It is private to this library's local storage scope, survives stop/start and sync, and is removed by session clear. Copying definition files or using `save` to import them does not transfer metadata. Use the manager's Include private metadata option, or `metadata get` and `metadata set`, after reviewing the existing source and destination references. Including metadata grants no external access and changes no external resource.

`stop` retains HTML, Markdown, and the proxy policy. `clear` removes those files and clears a running interface; `clear-all` does this throughout the selected scope. Review these deletions in Git before committing. Atomic saves detect a source file changed during preparation and fail rather than intentionally overwrite the newer contents. Resolve Git conflicts before loading a definition.

Use IDs that differ beyond letter case in a shared folder so files remain portable across operating systems. Private caching retains case-sensitive IDs through encoded filenames. HTML and descriptions must be valid UTF-8 and fit the CLI's 1 MiB input limit.
