# Connector backends

AGUI can invoke reviewed local connector scripts directly, without delivering every operation to an agent conversation. Agent Connectors owns script discovery, schemas, bundle revisions, private grants, credential profiles, execution, and receipts. AGUI adds saved action requirements, session scope, CLI controls, and a browser bridge over its existing WebSocket. Public backend invocation is disabled unless an owner issues an explicit [public capability](./connectors-public.md).

The runner supports trusted local/team code with host-user privileges. A content checksum detects changes; it does not establish authorship, sandbox code, or authorize execution. Review the code and its resource access before granting it. Application-specific data sources, access choices, and saving rules belong in the session description.

## Attach and review

Start with a saved AGUI and an existing local Agent Connectors registry. Attach one semantic script address under a session-local action key:

```sh
npx symbiote-agui connector attach my-workspace save --registry ./connector-scripts --script example.records.save
npx symbiote-agui connector review my-workspace save
npx symbiote-agui connector describe my-workspace save
npx symbiote-agui connector status my-workspace
```

Attaching does not grant access or run code. It stores the registry UUID, script address/UUID, reviewed revision, and read/write effect in `<ID>.connectors.json` alongside the HTML and Markdown description. The default cache uses the same encoded-name convention as other saved artifacts. Registry folders and execution authority stay private.

`review` returns the pinned contract, description, file hashes, and entry-point source. Use `review --path lib/helper.js` to inspect another UTF-8 bundle file. All runtime helpers are part of the bundle digest. `describe` reads only its Markdown description; `list` lists requirements. These controls work while stopped as well as through an authenticated live worker.

`status` reports transport availability, pending calls, requirements, and private `connectorControl.inspection` entries for source resolution, preparation, and configured invocation sources. Configured grants are diagnostic metadata; each actual invocation still validates current grants and credentials. Missing/stale sources fail explicitly rather than select another registry. Reconnect a source with `connector update <ID> <ACTION> --registry <NAME|PATH>`, or connect exactly one matching registry in Agent Connectors' private connection list.

## Grant and call

Prepare the exact revision using Agent Connectors before granting it. Then use `connector grant <ID> <ACTION> --revision <REVIEWED_REVISION> --source agent|agui`. Replace the revision placeholder with the full `sha256:` value from review.

- `agent` permits authenticated `connector call` commands. The worker derives this source from its private control route.
- `agui` permits the local interactive browser connection. The page cannot choose an invocation source, executable, registry path, grant, or credentials.
- Optional `--profile <NAME>` selects a private Agent Connectors credential profile. `--timeout <MS>` and `--result-bytes <BYTES>` may reduce the reviewed script's limits.
- `connector revoke <ID> <ACTION>` revokes its session-scoped grants and requests cancellation of active work. It cannot roll back an external write.

For a running session, `connector call <ID> <ACTION> --file call.json` reads this envelope, also accepted on stdin:

```json
{
  "requestId": "01234567-89ab-4cde-8fab-0123456789ab",
  "input": {
    "field": "value"
  }
}
```

The example fields are placeholders for the script's actual input schema. Use a fresh canonical UUID for a new immutable operation and keep it for reconciliation. Optional `revision`, `instanceId`, and `markupRevision` fields let callers explicitly reject a stale target; otherwise the CLI reads the current worker/attachment identity. Extra fields, including execution paths and source claims, are rejected. Input is bounded to 64 KiB, and the full request to 72 KiB.

Calls return `connectorResult` with request/action/worker identity, resolved revision, and `running`, `completed`, `rejected`, or `unknown` state. Completed results include schema-validated data; raw credentials, runner logs, grant tokens, and registry paths do not enter the browser result. A write completes only when its script asserts verified domain persistence through Agent Connectors' `context.verified(value)` contract. The framework cannot independently prove that assertion.

`connector call` exits 1 for rejected/unknown outcomes and retains its result in JSON output. `connector receipt <ID> <ACTION> --request <UUID>` reads a retained outcome through the running worker; reading an unknown result is a successful status operation. Repeated calls retain the original request ID and input, and never automatically rerun a possibly started operation. A changed input or scope cannot reuse another operation's ID.

## Declarative interfaces and manager

Use the headless [`agui-connector`](../src/uilib/controls/connector/README.md) to bind input, explicitly run an action, and publish matching results through `pub-to`. Compose existing buttons, fields, preloaders, messages, and state components. Optional initial loading is read-only; typing and reconnection never submit writes. See the [runnable example](./examples/connectors/README.md).

Select a saved session in the manager and open Connectors. Attach local sources, inspect source/contract/bundle hashes, grant an exact prepared revision for a chosen invocation source and private credential profile, or update/revoke/detach it. Controls work while running or stopped. Lifecycle identity guards reject stale edits; changing projects clears the review. Granting requires explicit confirmation and executes no code. Create profiles privately with Agent Connectors; their values never enter the page.

## Browser API

Marked session modules receive `callConnector` and `readConnectorReceipt` in their existing page API. They are also exported from the fully resolved `/client/index.js` URL:

```js
let {
  callConnector,
  readConnectorReceipt,
} = await import(new URL('/client/index.js', location.href).href);
let requestId = crypto.randomUUID();
let result = await callConnector('save', input, {
  requestId,
});
// After uncertain delivery, inspect this same request; do not create another write.
let recovered = await readConnectorReceipt('save', requestId);
```

Invoke writes from an explicit application action. Ordinary typing, binding updates, reload, and connection restoration do not submit writes automatically. The API captures input once, checks current connection/markup readiness, and suppresses calls made during an AGUI agent command. The server independently rejects calls while that page has an agent command pending. Direct agent execution uses the authenticated CLI source instead.

The native `AGUI_CONNECTORS` context exposes `connected`, `current` (transport status and requirements), `pending`, and the latest `result`. Results carry their original request and script revision; low-level callers must compare them before marking a newer draft saved. The declarative connector handles that check for bound input. No automatic data-toolbar synchronization is performed.

Disconnect resolves pending promises as unknown. Reconnection queries retained receipts without resubmitting input. A failed receipt lookup preserves uncertainty; it does not prove that no write occurred. Running receipts can be read again explicitly. Same-document recovery retains references in memory; a full reload requires the application to retain and read its own request IDs. Unknown and completed backend outcomes remain separate from local data-cache commits and agent feedback delivery.

## Registry metadata storage

Registry metadata may use files, local SQLite, or a shared PostgreSQL catalog through Agent Connectors' existing API. Configure it with that package's `registry storage` and `registry reconnect` commands; AGUI's attach, review, grant, and call workflow stays the same. The package's storage guide (`agent-connectors/docs/storage.md`) covers schema provisioning, restricted roles, and explicit metadata import/export.

A portable registry marker contains only backend type and registry UUID. Database locations, connection profiles, prepared snapshots, and execution grants stay private. Each execution host still needs matching source or a verified local snapshot and its own grants. Remote binding changes cannot approve new code. Missing database access fails rather than selecting a stale file registry; sharing an AGUI or its sidecar never transfers backend access.

## Access and lifecycle

- Backend calls and receipt reads require local interactive admission or a separately issued [public capability](./connectors-public.md). Local admission checks the WebSocket's origin, Host, and forwarding metadata. A viewer cannot invoke backends; public user-role election alone grants no authority. Public and forwarded connections never inherit local grants, even through forged source claims.
- The existing private control server handles attachment, review, grants, and CLI calls. Its credential stays outside the generated page and tunnel routes. Older workers return `NOT_IMPLEMENTED`; preserve drafts and restart explicitly to enable the feature.
- Grants bind private session identity and action scope as well as the exact script revision. A normal stop/start retains that scope, but rejects the old worker instance on new requests. Accepted operations are cancelled during shutdown and retain their uncertain outcome when execution may have started.
- `connector update <ID> <ACTION>` explicitly refreshes a semantic address to its current registry revision and revokes prior authority when the requirement or local source changes. Merely moving a registry alias never executes a new revision. Unchanged requirements do not require redundant regranting.
- `connector detach <ID> <ACTION>` revokes its grants, requests cancellation, and removes the requirement. Existing receipts remain in private core storage for reconciliation.
- Startup and saved-file sync validate requirements and revoke changed/removed bindings before further calls. Reverting a previously accepted change does not restore its old grant. Clear removes the sidecar and rotates private session authority. Neither restores grants from Git.
- Copy, move, rename, and private-cache import preserve portable requirements. Destination session/project scope gets no inherited grant or source-path settings; configure local access and grant again. Source execution receipts remain in Agent Connectors' private history with their request IDs. After clear/rename/move changes authority scope, inspect older outcomes through the core receipt commands rather than replaying them in the new scope.

Agent Connectors' private state location follows `AGENT_CONNECTORS_HOME` or its own default. AGUI's additional local routes/identity live in `.connectors/` under the session's private storage namespace. Keep both outside team Git folders. Core execution limits, credential rotation, bounded receipt capacity, and trusted-code limitations continue to apply.
