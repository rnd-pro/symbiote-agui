# AGUI reference

For an introduction and first-use setup, see the [README](../README.md). See the [team library guide](./library.md) for Git-based reuse, folder settings, descriptions, and syncing. Interface generation, Symbiote patterns, and tool invocation are covered by the [AGUI skill](../skills/agui/SKILL.md).

## Session manager

```sh
npx symbiote-agui manager
npx symbiote-agui manager --no-open
npx symbiote-agui manager status
npx symbiote-agui manager stop
npx symbiote-agui manager restart
npx symbiote-agui manager restart --no-open
```

The built-in Symbiote page calls AGUI functions directly over its own authenticated WebSocket. It does not need an agent, MCP setup, or browser debugging. It lists running and saved sessions, descriptions, clients, process IDs, and current links. Search, status filters, individual controls, and scoped bulk actions use the shared UI library. The theme toggle selects light/dark; the initial theme follows your operating system when no preference is saved. Your choice is remembered across reloads and synchronized between tabs in the same browser at the manager URL.

Click a session row in Table, or focus it and press Space/Enter, to open its controls in the right sidebar. Table and Cards share one selected session; sidebar actions apply to that session.

Public waits for a fresh reachability check before opening a browser tab with a role-free link. Its button shows progress while waiting; failed checks open no tab. Newly registered tunnels get up to one minute for DNS and routing to settle, with repeated checks on the same URL. An older inactive tunnel is renewed at most once; the replacement gets the same readiness window before opening. A readiness timeout keeps the new tunnel and reports the connection error, so retrying can reuse it. A renewal performed elsewhere during the check is reused. The local session keeps running. Viewer page follows the same verification workflow with explicit `?mode=viewer`. The first eligible connection becomes the user; another open tab becomes a viewer instead of claiming that role. If the browser blocks the new tab, use Open verified link after verification finishes.

Connections shows every running worker in Default and all project scopes, including projects outside the current selection or no longer remembered in Projects. Each session lists its project, browser clients, user/viewer roles, readiness, connection times when available, and tunnel state. Refresh connections reloads the list; visible Connections also refreshes periodically. Inspection failures remain visible instead of hiding sessions.

Disconnect browser ends only that connection, retaining its visible page and local drafts. It stops automatic reconnects; reloading the tab can reconnect, and the next eligible new connection can take a vacant user role. Check tunnel and Renew tunnel operate on the listed session. Stop tunnel ends public access while retaining the worker and local pages. Disconnect, renewal, and tunnel stop require confirmation. Older workers remain inspectable; save or export drafts before restarting them to enable unavailable connection controls. The manager never restarts workers automatically for compatibility.

For a running session, choose Feedback command to configure or disable private agent delivery. Enter the originating conversation ID and the command object described under [private feedback handlers](#private-feedback-handlers). Save command validates and registers it without executing it. The dialog can reload current settings; routine manager refreshes leave edits in place. Configuration stays in worker memory and is cleared when the session stops. An existing conversation binding cannot change until a new worker starts. These controls are available only in the authenticated local manager; generated AGUIs and public links cannot configure host commands.

One detached manager runs per private state directory for all connected folders and Default. Repeating `manager` from any project reuses its process and URL, with that folder selected in the app. Switching projects refreshes folder contents and session statuses inside the same page. Tabs can select folders independently. Session stop/clear-all commands leave the manager running. `manager stop` stops only the manager and waits for accepted operations to finish. `manager restart` waits for that shutdown, then starts the manager with fresh assets and opens its new launch URL. Use `--no-open` to return the URL without opening a browser. If the manager is stopped, restart starts it. AGUI workers, tunnels, saved interfaces, and committed data remain in place; reopen the manager through the returned `launchUrl` because its URL and browser authorization change.

Use Projects to connect existing AGUI folders and revisit them or Default. Choose folder opens a native picker on the computer running Node and connects the selected folder; canceling leaves connections unchanged. Enter folder path provides optional manual entry. Desktop pickers use macOS or Windows system dialogs, or an installed Zenity/KDialog on Linux; if unavailable, use manual entry. Switch selects the folder in the same manager without changing save-folder configuration or moving files, sessions, or data. Manage projects shows paths and availability; Forget connection removes only the remembered connection. Default and the current project cannot be forgotten.

Open folder requests a file-manager window on the computer running Node, using Finder on macOS, Explorer on Windows, or the desktop file manager on Linux. It works for the selected project and each listed connection, including the current one. Default opens only the saved-definition cache. The request leaves sessions and browser drafts unchanged. Desktop support is required; errors show a folder path you can copy and open manually. A successful request does not confirm that a window appeared.

Select Project explorer beside Table and Cards to browse the current project. Folders load when expanded; breadcrumbs revisit ancestors, Load more entries pages large folders, and Refresh files reloads the tree. Show hidden files and dependencies includes dotfiles, `.git`, and `node_modules`; private AGUI runtime storage stays excluded. Default shows saved HTML and Markdown under readable session names.

File previews are read-only. Supported code files, including HTML, JavaScript, JSON, and CSS, have syntax highlighting with a plain-text fallback. Markdown uses the document renderer with custom elements disabled. Previews accept UTF-8 text up to 128 KiB, or 64 KiB for Markdown. Other formats and larger files show an explanation and can be inspected through Open folder. Each directory scan is limited to 5,000 entries, with 100 entries per page. Browsing does not execute project code or publish project files through manager assets or tunnels.

Select a saved session to use Copy to project or Move to project. Choose a connected destination, including Default, and keep or change the session ID. Existing destinations and case-conflicting names are rejected. HTML and its Markdown description are preserved; Include saved data and Include private metadata are off by default. The dialog shows metadata's existing source and destination references. Copying those references grants no external access and changes no external resource.

Copy can capture a running worker's accepted definition and committed data without changing its page, URL, tunnel, or feedback. Browser drafts are excluded. If snapshot support is unavailable, save or export drafts and restart that session before copying. Move requires a stopped source and verifies the destination before removing source files. Excluded data and metadata remain in the private backup identified by the result. The destination stays stopped, with a fresh identity and URL when started. Open destination project navigates separately; other open managers refresh through their normal status polling.

Transfers check static relative asset and module references against the destination. Supply missing dependencies before transferring; unrelated files and dynamic references are not copied or rewritten. Review dynamic references yourself. Definitions must be regular files rather than symbolic links. External persistence, Git staging, and commits remain separate operations.

Open Transfers to review receipts and recover an incomplete operation. Pending destinations and move sources reject conflicting starts and writes until reviewed. Recovery explicitly restores missing source files and removes unchanged partial destination files; changed files are preserved for reconciliation. It never automatically repeats an uncertain mutation. Receipts and backups remain private on the Node host, outside the team library, and survive manager restarts.

Open Settings to choose where interface HTML and Markdown are saved. Save folder and open updates `.agui.json` for the project from which that manager was started, then selects that folder in the current manager. Relative paths use the displayed project directory. Use default cache removes the folder setting and opens the private cache. Existing files, running sessions, and committed data stay in their original scope; the manager process and origin remain the same. An `AGUI_LIBRARY_DIR` override makes the setting read-only. Stop and relaunch the manager after unsetting an override or when you need its settings to belong to a different project.

Launching opens and authorizes your browser automatically. With `--no-open`, open the returned private `launchUrl` once. Its credential is removed from the address bar and retained in that browser's storage for reloads, reconnects, and additional tabs. The readable `url` works afterward in that browser. Keep `launchUrl` private. A different browser needs the launch link from `manager` too. Folder selection may appear as a `project` query parameter; it grants no authorization and does not identify a separate manager.

The manager binds only to loopback, validates Host/Origin and operation inputs, and cannot be framed or published through AGUI tunnels. Ordinary generated pages and public user/viewer pages cannot call its management operations. Worker control tokens stay inside Node. The manager page serves packaged assets only and cannot run arbitrary functions or shell commands. Its dedicated save-folder operation accepts a directory path; session operations continue using their pinned storage paths.

Use Attach tunnel on a running local session to create public user and viewer links without restarting its worker or resetting its live interface. Failed attachment leaves the session available and exposes Retry tunnel. Tunnel attached identifies an existing connector; use the public links to share it, Check tunnel to verify reachability, or Renew tunnel to replace inactive links. The CLI equivalent is `npx symbiote-agui share <SESSION_ID>`.

Every connection loads fresh backend state. While visible, the page refreshes roughly every five seconds and after operations, including changes made through the CLI or Git. Tunnel reachability is checked separately with Check tunnel; check times and stale/unchecked health are shown. Renew replaces public links. Sync discards unsaved edits and retains compatible committed data. Clear requires confirmation and deletes saved HTML, Markdown, private data, and metadata, including definition files in a configured Git library.

Operation results include individual bulk failures. Repeated mutation request IDs reuse their result for ten minutes; conflicting operations on a session run in sequence. A disconnect or timeout can leave an unknown outcome. The page refreshes after reconnecting and never automatically replays an action. Review current status before deliberately submitting it again.

Rename in the selected session's sidebar changes its ID and saved filenames within the current project. Save or export browser drafts and stop the session first. The description, committed data, and private metadata are retained automatically; the renamed session stays stopped and becomes selected. Name collisions, including case-only changes, are rejected. Display titles from Markdown and references inside HTML/Markdown are preserved; existing links do not redirect. On its next start, the renamed session gets a new worker identity and URL. Incomplete renames use the same Transfers receipts and recovery controls as moves.

## Session controls

Local, shared user, and viewer tabs use the session ID as their browser title. A colored emoji favicon is selected from a fixed palette by session ID and stays the same across reloads and restarts. Colors can repeat between sessions.

Use Node.js 24 or newer. Session IDs are case-sensitive, contain 1-64 letters, digits, underscores, or hyphens, and start with a letter or digit. Private-cache IDs are shared across working directories for the current OS user. A configured library scopes IDs to its folder; use names that differ beyond letter case in a shared folder for portability.

```sh
npx symbiote-agui start my-workspace
npx symbiote-agui start all
npx symbiote-agui status all
npx symbiote-agui status my-workspace
npx symbiote-agui stop my-workspace
npx symbiote-agui rename my-workspace renamed-workspace
npx symbiote-agui stop all
npx symbiote-agui clear my-workspace
```

- `start` opens the regular browser and restores the saved interface when available. With `--no-open`, open the returned `url` yourself.
- `start all` starts saved and recorded sessions in the current storage root, reuses running workers without resetting their interfaces, and opens their pages. Use `--no-open` to return links without opening tabs. It returns per-session results and continues after failures. Restarted sessions restore saved definitions and run locally; use `share <SESSION_ID>` to create new public links.
- `status` reports `waiting` without connected pages, `ready` with connected pages, or `stopped`. A shared session can have viewers connected while waiting for an interactive user.
- `status all` lists all recorded and saved sessions in the current storage root. Each successful result has `active: true` for a running session or `active: false` with `state: "stopped"` for an inactive session. Running sessions include verified OS process IDs (`pid`), local URLs, and current public user/viewer URLs when sharing is active. Inactive sessions have no live links or PID. Unreachable sessions report individual failures with `active: null` (unknown) without hiding other results. Results contain `command`, `total`, and a `sessions` array; partial failures set `ok: false` and exit with code 1. The word `all` selects the bulk operation for `start`, `status`, and `stop`.
- `stop` ends the session and its tunnel, retaining the saved interface. Tabs remain open with `Session ended.`.
- `rename <SESSION_ID> <NEW_SESSION_ID>` renames a stopped saved session in the current scope, retaining its description, committed data, and metadata. It does not overwrite existing files, start a worker, or rewrite embedded references. Results include `previousSessionId`, the resulting `sessionId`, `renamed`, and a transfer receipt. A partial failure returns `ok: false`; review its receipt through Transfers before retrying.
- `clear` discards the saved interface and clears live content. A running session and its tunnel stay available. Clearing also works while stopped.

`stop all` (also available as `stop-all`) stops every session and its tunnel in the current storage root, retaining saved interfaces. `clear-all` discards every saved definition and clears live interfaces while keeping workers running. Both include sessions created from other directories and report per-session results, continuing after individual failures. `all` is reserved for the bulk operation in `start all`, `status all`, and `stop all`.

Run `npx symbiote-agui --help` for the command list. Session commands return JSON, except help and version. Exit codes are 0 for success, 1 for runtime failure, and 2 for invalid input.

## Session data-flow metadata

Saved sessions can carry structured private metadata alongside their Markdown description:

```sh
npx symbiote-agui metadata get my-workspace
npx symbiote-agui metadata set my-workspace --file ./metadata.json
npx symbiote-agui metadata clear my-workspace --key dataFlow
```

`get` returns `{ sessionId, metadata }` inside the normal CLI result. `set` accepts JSON from a file or stdin, replacing each supplied top-level metadata field and retaining omitted fields. A supplied `dataFlow` must be complete; nested objects are not merged. `clear --key dataFlow` removes only that field, preserving HTML, Markdown, and application data. Commands work with stopped and running saved sessions without restarting workers.

Example `metadata.json` using fictional data:

```json
{
  "dataFlow": {
    "description": "Edit a sample inventory.",
    "initialSource": {
      "kind": "json-file",
      "reference": "sample-inventory.json",
      "description": "Manually imported records."
    },
    "bindings": [{ "provider": "INVENTORY", "keys": ["records"] }],
    "targets": [
      { "kind": "agui-cache", "description": "Intended local snapshot." },
      { "kind": "database", "reference": "demo.inventory", "description": "Authorized agent-mediated updates." }
    ]
  }
}
```

`dataFlow` requires a description, one `initialSource`, nonempty provider `bindings`, and nonempty `targets`. Each endpoint has `kind`, `description`, and an optional non-secret `reference`. Kinds are `inline-json`, `json-file`, `agui-cache`, `database`, `api`, `manual`, or `other`. Group unique plain property keys under each unique provider. Input is limited to 16 KiB; unknown fields, runtime settings, and credential-bearing URLs are rejected. URL references use HTTP(S) without credentials, query strings, or fragments; use a descriptive resource name when a URL is unsuitable. Never include credentials or application records in descriptions or references.

`describe` returns full metadata when present. `list --query` searches it and returns a data-flow summary; the local manager displays that summary and includes the full flow in its Description dialog. Metadata describes intended behavior, not proof of synchronization or authorization to perform it. Editing it does not read a source, write a target, change initial application values, or trigger feedback. Preserve the original source description when a cache restores the same data.

Metadata lives under the private, library-scoped state root in `.metadata/`, outside shared definitions and worker instance directories. Stop/start, insert, sync, and Markdown edits retain it; clearing the session removes it. Copying HTML/Markdown files or importing them with `save` does not copy metadata. To transfer it intentionally, select Include private metadata in the manager's Copy or Move dialog, or prepare a file containing the desired `metadata` object from `get` and run `set` in the destination scope. Review local references before transferring or sharing metadata. Reloading an existing manager does not update its running code; restart the manager after upgrading to load the current controls.

## Local data commits

Declare persistent properties on a named provider with `persist="key otherKey"` and one direct inline JSON script. Each declared key must exist in that JSON. Use one declaration per provider, outside reusable templates; `AGUI_DATA`, `AGUI_FEEDBACK`, `AGUI_SESSION`, and `AGUI_TEXT` are reserved names. Metadata bindings describe intent; they do not enable persistence.

```html
<context-provider ctx="APP" persist="records">
  <script type="application/json">{"records":[],"filter":""}</script>
  <!-- Bind controls to APP/records using native Symbiote APIs. -->
</context-provider>
```

Marked modules receive `commitData`; it is also exported from `/client/index.js`. Call it from an explicit Save handler after application validation:

```js
let saved = await commitData([{ provider: 'APP', keys: ['records'] }]);
```

The call captures an immutable JSON snapshot from native named contexts. The worker patches only those declared properties in the accepted HTML's inline JSON and atomically publishes a private `.runtime/` snapshot before returning `committed`. It leaves the authored definition, unrelated JSON, modules, and templates intact and does not rerender the page or replace newer draft values. Nothing automatically saves ordinary input, `update`, or tool changes. Restoration and pending agent page commands reject commits with `PAGE_BUSY` to avoid loops and command-queue deadlocks. Viewers cannot commit or query receipts.

Results contain `commitId`, `instanceId`, `markupRevision`, `state`, and, on success, the new data `revision`. States are `committed`, `rejected`, or `unknown`; `queued` is intermediate. Failures carry a stable `failure.code` and safe message. Reject stale workers, replaced markup, and stale data revisions before changing the cache. Another tab's successful save makes an older draft stale; reconcile it before submitting. A known failure retains both the previous snapshot and current draft. An uncertain outcome requires checking the saved data before retrying.

The reserved native context `AGUI_DATA` exposes `connected`, `current` (worker/markup/data revisions and declared `targets`), `baseRevision`, `stale`, `pending`, and the latest `result`. Treat it as read-only; use standard bindings or the exported `getDataState()`. Application dirty state and committed baselines remain separate from transport status. Saving locally does not notify the agent or confirm an external write; call `submitFeedback` separately after a successful commit, retaining the original native event.

Optional `{ commitId }` accepts a UUID. Identical IDs and payloads reuse retained worker receipts; conflicting payloads are rejected. `readDataCommit({ commitId, instanceId, markupRevision })` queries an outcome without submitting. Reconnection queries uncertain references automatically within the same page and worker, never replaying a write. Limits are 1 MiB per commit message and final HTML, JSON depth 32, 32 providers, 64 keys per provider, 16 pending requests, 100 retained worker receipts, and a 20-second browser wait. Timeout/disconnect yields `unknown` if dispatch might have occurred. Full reload loses in-memory recovery references; worker restart loses receipts while preserving saved HTML and its data revision. Missing, expired, or previous-instance receipts remain unknown.

Reload, reconnect, and stop/start initialize declared values from committed inline JSON. Keep handlers and transient state outside `persist`, and do not overwrite restored properties with module defaults. Compatible definition replacements retain saved values and use defaults for newly added keys. Removed/renamed declarations or changed non-null top-level types cause `DATA_CONFLICT` on insert/sync. This checks declaration compatibility, not business schemas. An incompatible source found at startup restores the previous saved interface with a warning and blocks commits until reconciled. After backing up needed data, `npx symbiote-agui sync my-workspace --reset-data` explicitly discards that snapshot and loads source defaults. `sync all` cannot reset data. Clear removes the snapshot; stop retains it. Private snapshots are scoped to session/library identity and do not accompany copied team definitions.

Existing workers need a deliberate stop/start to load upgraded code; they are never restarted automatically.

### Floating data toolbar

Add one `<agui-data-toolbar bind="state: AGUI_TEXT/dataToolbar"></agui-data-toolbar>` last in the dashboard. It targets all declared `persist` keys by default. Optional `provider="APP" keys="records"` selects a subset; `form="FORM_ID"` enables validation when the toolbar is outside the form. The default bundle supplies its actions without session scripts. Text comes from the page-owned `AGUI_TEXT/dataToolbar` dictionary through the native `state` binding (`{ texts: { ... } }`); use an application-owned dictionary to customize labels, statuses, and errors. Components have no built-in text fallbacks. The bar wraps at narrow widths, reserves its measured height, and includes safe-area padding. Review layout and native file pickers in your browser.

Save captures the draft and confirms local publication before submitting `agui.data.submitted` feedback containing the commit reference and actual provider bindings when they fit within 4 KiB. Larger selections send `targetCount`; inspect `read_submission_status` for bindings. The agent reads metadata for the intended flow and uses the scoped `read_saved_data` tool to inspect committed values. Local save, agent delivery, external verification, errors, and unsaved edits remain separate. Disabled feedback still permits local saving. A failed cache write sends no feedback and keeps edits. Check save status queries an uncertain receipt without resubmitting; it never automatically forwards a recovered save to the agent.

Cancel changes restores the last locally committed snapshot and does not undo prior saves or external operations. Import replaces selected draft properties after validating the complete contract; it does not save, merge, or notify. Export includes unsaved values and reports download initiation only. Both work while disconnected. Portable files contain `{ "version": 1, "changes": [{ "provider": "APP", "values": { "records": [] } }] }` and are limited to 1 MiB. The toolbar reports actual file labels and uses a configured manual/JSON export destination when present; initial-source metadata remains unchanged. Worker data-flow metadata is loaded at startup and refreshed by Save.

One floating icon button opens the data actions and detailed statuses in a native popup. Its color and icon show unsaved changes, progress, failures, or uncertain outcomes. Blue distinguishes a local save or pending verification; green appears only after a verified external write and never for a newer unsaved draft. The button's accessible name and tooltip include its status. Escape, clicking outside, or Close data actions dismisses the popup without changing data.

The popup displays the current page's User/Viewer role and Connected/Disconnected socket state. Native `AGUI_SESSION` owns these read-only fields. Viewers can open their own status popup, with data actions disabled, outside the inert mirrored document. The user's data popup is excluded from the mirror. A connected socket does not imply external synchronization.

Discover the toolbar's scoped `read_submission_status`, `read_saved_data`, and `acknowledge_submission` tools normally. Saved reads require `commitId`, `instanceId`, `markupRevision`, `revision`, `provider`, and `key`; optional `path`, `offset`, and `limit` select nested data and bound results to 8 KiB. Expired receipts or superseded revisions fail explicitly. Acknowledgements require the exact four reference fields and `state` (`verified`, `failed`, or `unknown`), with an optional message up to 512 characters. Verify the entire submitted operation before reporting `verified`; the toolbar does not infer record-level database success. Native `bind="$.externalResult: APP/result"` accepts the same acknowledgement object. Older acknowledgements cannot mark newer submissions verified, and successful acknowledgements never clear newer unsaved edits.

The packaged `src/page/uilib-gallery.html` demonstrates this workflow with fictional profile data. Shared name, Shared status, and Notifications are persistent; its other controls are transient. The gallery includes a copyable import document and illustrative status examples, while the actual floating toolbar reports only real operations. Save and reopen the session to review restoration, then export its JSON for a manual backup.

## Private feedback handlers

The CLI can register a private command for the current worker. Explicit browser submissions can invoke that command; ordinary events are never forwarded automatically. Verify native delivery to the same originating conversation, including idle and busy behavior, before configuring it. Delivery acknowledgement does not confirm an external write.

```sh
npx symbiote-agui feedback status my-workspace
npx symbiote-agui feedback check my-workspace --conversation <CURRENT_CHAT_ID>
npx symbiote-agui feedback configure my-workspace --file /private/path/feedback.json
npx symbiote-agui feedback disable my-workspace
```

These commands require a running session. `check` compares the supplied chat ID with the worker's private binding without sending a message or changing configuration. Its `feedbackCheck` reports `instanceId`, readiness `state`, `binding` (`unbound`, `matching`, or `different`), `ready`, and recommended `action` (`none`, `configure`, `reconnect`, or `restart`). Exit code 0 means a ready matching registration; exit 1 with `FEEDBACK_NOT_READY` means setup is required, and invalid arguments exit 2. It reveals neither the actual bound chat ID nor the handler. This is a registration check, not proof of native delivery or external persistence. Older workers return `NOT_IMPLEMENTED`; preserve drafts and review a restart before upgrading a live worker.

`configure` accepts JSON from `--file` or stdin:

```json
{
  "sessionId": "my-workspace",
  "instanceId": "CURRENT_INSTANCE_ID_FROM_FEEDBACK_STATUS",
  "conversationId": "ORIGINATING_CONVERSATION_ID",
  "command": {
    "executable": "/absolute/path/to/node",
    "args": ["/private/path/to/session-feedback.mjs"],
    "cwd": "/absolute/path/to/workspace",
    "input": { "channel": "stdin" }
  }
}
```

The executable and optional working directory must exist and use absolute paths. The worker spawns the command with `shell: false`, passing a JSON envelope through stdin with a newline and EOF. For a native command accepting an argument, use `input: { "channel": "argument", "index": 0 }`; `index` inserts the envelope as one argument into the fixed `args` array, from zero through its length. The envelope contains the event, submission ID, application revision when supplied, session instance, session ID, and registered conversation ID. The process receives a limited environment for paths, home/config directories, locale, and temporary files; arbitrary worker variables such as `NODE_OPTIONS` are not inherited.

The handler must report native acknowledgement with one JSON object on stdout: `{ "state": "accepted", "receiptId": "optional-native-id" }`, `{ "state": "unavailable" }`, `{ "state": "rejected" }`, or `{ "state": "unknown" }`. Receipt IDs allow 1-256 letters, digits, underscores, dots, colons, or hyphens. Exit zero alone does not confirm delivery. Raw output and command configuration are excluded from public status. Credentials belong in existing authorized local access, never event payloads or command arguments.

Execution is ordered on a separate queue. Limits are 16 KiB per configuration/submission message, 16 pending submissions, 100 retained receipts, 10 seconds per command, and 8 KiB of combined stdout/stderr. A full queue rejects new work explicitly. Identical submission IDs reuse retained receipts; conflicting payloads are rejected. Timeout, malformed acknowledgement, or a failure after dispatch reports an unknown outcome and never retries automatically. External persistence needs a separate verified acknowledgement from the agent.

Registration stays in memory and is disabled by clear, stop, explicit disable, or a handler reporting the conversation unavailable. Disabling rejects queued work and terminates active commands; publication already accepted by a native harness cannot be undone. POSIX cleanup targets the spawned process group; Windows cleanup targets the direct child. The originating conversation binding lasts for the worker instance, so changing conversations requires a new instance. Restarted workers have feedback disabled. Older workers report unsupported feedback and are not restarted automatically.

### Explicit browser submissions

Marked modules receive `submitFeedback` alongside `emit`, and `/client/index.js` exports it for component methods. Call it inside a real Save/Apply/Submit handler after local validation and saving the local draft. Read fields from the existing Symbiote context; keep normal input bindings and `pub-to` attributes.

```js
let delivery = await submitFeedback({
  type: 'changes.submitted',
  source: 'contact-editor',
  data: { name: this.$.name, role: this.$.role },
}, { userEvent, submissionId: commitId, revision });
```

`userEvent` must be the trusted native click or submit event received by the handler. Each event can submit once. Synthetic events, native agent-invoked form submissions, restoration, and agent-driven page/tool commands are blocked. Omit `submissionId` to generate a UUID, or use an application's immutable commit UUID. Supply the application revision separately when acknowledgements must match a specific version. The API resolves with `accepted`, `rejected`, or `unknown`; `queued` is an intermediate transport state. It never marks application records persisted.

The reserved native Symbiote context `AGUI_FEEDBACK` exposes `availability`, `connected`, `pending`, `delivery`, `status`, and `message`. Treat it as read-only and do not create a provider with that name. `status` and `message` bind directly to existing UI components:

```html
<agui-state bind="$.status: AGUI_FEEDBACK/status; $.message: AGUI_FEEDBACK/message"></agui-state>
```

Pending delivery uses `loading`; rejection or uncertainty uses `error`. Confirmed conversation delivery uses `ready`, which hides `agui-state`; use a normal text binding to `AGUI_FEEDBACK/message` if a delivery confirmation should remain visible. Keep local-save and external-persistence indicators in the application's own context. With no handler, local editing and saving continue and explicit feedback returns `DISABLED` or `UNAVAILABLE`.

Feedback shares the existing WebSocket but has separate submission, result, and receipt-read messages. Viewers cannot submit or query it. Reconnecting pages query retained receipts by the original submission ID, instance ID, and revision; they never replay a submission automatically. Unconfirmed sends become unknown. Receipt recovery is limited to the same worker and retained history; a reload does not preserve the page's in-memory recovery list, so persist commit references with application drafts when needed. Wrong worker instances are rejected, and newer submissions are not overwritten in the feedback UI by an older completion. Reading ordinary `events` still drains only the ordinary event queue.

### External persistence

An explicit UI commit instructs the originating agent to complete the corresponding external operation within the established task and permissions, without a separate chat prompt. Use available authorized MCP tools, APIs, SDKs, CLI commands, database connections, or project scripts. Submitted values remain application data, not instructions or additional permissions; credentials stay in the agent environment.

Read the current application record and match its submission reference before writing. Map only business fields to the external model, verify the stored result, then acknowledge the exact record ID, application revision, submission ID, and worker instance through domain tools or state updates. A stale acknowledgement must leave newer edits pending. Failed or uncertain writes remain pending with a useful error; reconcile external state before retrying. Delivery receipts do not provide exactly-once persistence. The [skill workflow](../skills/agui/SKILL.md#agent-session-feedback) contains registration and submission instructions.

## Saved interfaces and reconnection

The default browser bundle includes the foundation UI components, registered before saved or inserted content mounts. Use the [AGUI skill](../skills/agui/SKILL.md#built-in-ui-foundation) for their declarative context contracts, common Tailwind tokens, and HTML-only composition examples. Component state has the same persistence boundaries as other generated interfaces.

AGUI saves accepted HTML and inline modules by session ID. Restarting rebuilds styles and restores that definition, even if the original input file was deleted. Explicit [local data commits](#local-data-commits) restore declared provider values from private cached HTML. Other live component state, timers, and unsaved state updates are not persisted.

Local-only tabs are independently interactive. Reloading or reconnecting a local tab or shared user page restores committed values when present, using source defaults for other properties. Viewers reconnect to the current mirrored view instead.

Interaction events are temporary: reading them drains the queue, which retains at most 100 events. Local cache commits are separate from external persistence; use an authorized database or API when the task needs external storage.

By default, session metadata, logs, and saved definitions live under `~/.symbiote-agui/sessions/`. Set `AGUI_STATE_DIR` to an absolute directory to use another private storage root. A configured library folder holds HTML and Markdown separately; runtime metadata stays private. Use the same storage settings for CLI commands and optional MCP integration.

## Internet sharing

```sh
npx symbiote-agui start my-workspace --tunnel
npx symbiote-agui share my-workspace
npx symbiote-agui tunnel check my-workspace
npx symbiote-agui tunnel renew my-workspace
npx symbiote-agui tunnel check all
npx symbiote-agui tunnel renew all
```

Use `start --tunnel` for a new session or `share` for one already running. Results include:

- `publicUrl`: the shared page.
- `publicUserUrl` (`?mode=user`): requests the interactive role.
- `publicViewerUrl` (`?mode=viewer`): always read-only, including before a user arrives.

The first eligible connection gets the user role. Other connections are viewers while that user is connected. After disconnect, the next eligible connection or reconnection can take the role. Existing viewers stay viewers until reconnecting; explicit viewer links never claim the role. If local tabs are already connected when sharing starts, the first connected tab becomes the user.

Viewers receive the current rendered view and subsequent user and agent updates. They run no generated modules, expose no tools, and cannot submit application actions or events. They retain the last view when the user disconnects. New insertions wait for a user to render them; clearing removes the old view immediately.

Each viewer gets a colored marker visible to everyone in the session. Drawing is enabled by default for mouse, touch and pen. Move the pointer to point at content, or hold the primary mouse button and drag to highlight it. Open the floating status button and turn off Enable drawing to stop drawing for every pointer type and restore ordinary touch scrolling. Marker cursors remain visible, and the choice survives live updates and reconnects in that page; reloading restores the default. The interactive user keeps normal page controls. Viewers can scroll independently and use their own status popup while the mirrored application stays read-only.

Highlights remain for three seconds, then fade over two seconds. Reduced-motion mode removes them at expiry without gradual fading. Late arrivals see unexpired highlights; reconnecting assigns a fresh marker identity without replaying old input. Missing content removes its highlights, and clearing or replacing the interface resets annotations. Markers and drawings are temporary collaboration data: they are not saved, exported, sent as feedback, or used to change application data. They require no extra connection or browser permission.

Up to 128 connected viewers can publish annotations; additional viewers can still watch. History is bounded to 64 stroke segments and 4,096 points, so older segments can disappear early during heavy drawing. Slow connections receive current annotation state rather than a backlog of movement.

Mirroring covers light DOM and ordinary form values, with a 1 MiB snapshot limit. Password values are omitted. Canvas, video frames, embedded pages, and shadow-root contents are not streamed.

AGUI uses `cloudflared` from PATH or downloads and verifies an official binary once. Automatic provisioning supports macOS/Linux on x64 or arm64 and Windows on x64. Set `AGUI_CLOUDFLARED_PATH` to an absolute executable path before starting a session to select an installation. Provisioning and tunnel connection can take up to 90 seconds after local startup.

Repeated `share` calls reuse the running tunnel. `tunnel renew <SESSION_ID>` closes its connector and creates replacement public links while keeping the session, interface, and local URL available. It also enables sharing for a running session without a tunnel. Open and distribute the new links; old public pages can disconnect. If replacement fails, the local session remains available and the old tunnel is not restored.

`tunnel check <SESSION_ID>` and `status` verify the public URL with a fresh, session-specific response, with a five-second request timeout. Connector `tunnel.state: "ready"` alone does not establish public reachability. `tunnel.active` is `true` when reachable, `false` when inactive or the check fails, and `null` when a newly created connector has not been checked. `tunnel.checkedAt` records a completed public check; `tunnel.checkError` explains failures separately from connector errors. A failed check does not prove Cloudflare disabled the tunnel: local network or DNS failures can also cause it. Public URL fields identify the configured hostname; check `tunnel.active` before using them. Checks do not create or replace tunnels.

`tunnel renew all` and `tunnel check all` target running sessions already configured for sharing, including failed connectors. They skip saved-only sessions and running sessions without sharing, report per-session results, and continue after failures. A failed check or renewal exits with code 1 and preserves available status details. An empty batch succeeds. If a worker reports that tunnel renewal is unavailable, stop and start that session before retrying.

Restarting a worker requires sharing again and creates a new hostname. Public links are accessible to anyone who has them and require the host to stay online. Cloudflare Quick Tunnels are temporary and have no uptime guarantee. See [Cloudflare's limits](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/#limitations).

Only the page server is exposed. The CLI control server stays local and authenticated. Browser connections require no cookie, token, or authorization request; WebSocket admission checks the session path and allowed origin.

## Optional AGUI MCP

The CLI workflow requires no MCP setup. To expose AGUI tools directly in a compatible agent environment, add an MCP server with:

```json
{
  "command": "npx",
  "args": ["symbiote-agui", "mcp"]
}
```

Reconnect the agent environment after configuration. This stdio server exposes `list_pages`, `list_tools`, and `call_tool` over the same worker and WebSocket used by the CLI. Shared-session viewers are excluded from automatic tool targeting. Session creation and content delivery remain available through the CLI.

## Optional Chrome DevTools MCP

Use this integration when you need native browser WebMCP access or browser inspection.

1. Enable WebMCP in Chrome using the [Chrome WebMCP instructions](https://developer.chrome.com/docs/devtools/agents/webmcp-debugging).
2. Enable remote debugging at `chrome://inspect/#remote-debugging`.
3. Add Chrome DevTools MCP to your agent environment with command `npx` and arguments `chrome-devtools-mcp`, `--autoConnect`, and `--categoryExperimentalWebmcp`.
4. Reconnect the agent environment and approve Chrome's connection prompt.

The agent needs `list_pages`, `list_webmcp_tools`, and `execute_webmcp_tool`. Apple Events access is not required. On macOS, a missing `DevToolsActivePort` error can indicate that the host app needs Google Chrome access under System Settings > Privacy & Security > Files & Folders.

See the [Chrome connection guide](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/advanced-usage.md#automatically-connecting-to-a-running-chrome-instance). For Symbiote APIs and explicit tool examples, see the [Symbiote WebMCP guide](https://github.com/symbiotejs/symbiote.js/blob/main/docs/webmcp.md).

## Troubleshooting

- `SESSION_EXISTS`: use `status` to find the existing session; do not repeatedly start it.
- `PAGE_UNAVAILABLE`: open the session URL. Shared sessions need a user connection for state updates and tool calls.
- `TUNNEL_FAILED`: the local session remains running. Inspect `status`, correct the reported problem, and use `tunnel renew <SESSION_ID>` to replace stale links or `share` to retry a failed connector. Later connector exits also appear in status.
- `CACHE_ERROR`: inspect the reported storage path. Failed insertions preserve the saved definition, although a page may already have received changes.
- `SESSION_UNREACHABLE`: inspect the session's `worker.log` rather than repeatedly starting it or killing a stored process ID.

A failed browser opener returns `opened: false` and readable URLs; open the appropriate URL manually. A failed or timed-out tool call can have an unknown outcome. Check its result before asking the agent to repeat it.
