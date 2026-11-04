# Public connector capabilities

Connector backends are local by default. To let an interactive visitor invoke a reviewed action over a public tunnel, an owner can issue a private, expiring bearer capability. This is separate from the shared page's user/viewer role. Viewers cannot invoke backends, even with a valid capability.

The capability authorizes one actor label, session/project, action, exact prepared revision, HTTPS origin, and resource scope. Possession authenticates that capability; the actor label is an owner-assigned reference, not proof of a person's identity. There is no anonymous backend execution or built-in identity provider. Local grants do not become public grants.

## Issue and revoke access

[Attach, prepare, and review](./connectors.md#attach-and-review) the connector first. Its code must be trusted and its input contract must identify the resources it accesses. Confirm the intended audience, operations, and resources before issuing access. Start sharing the session to obtain its current HTTPS origin.

Create a private policy file. These names and values are placeholders for an actual reviewed action:

```json
{
  "revision": "sha256:<reviewed-64-character-hex-digest>",
  "actor": "example-actor",
  "origin": "https://example.trycloudflare.com",
  "resources": {
    "workspaceId": "example-workspace"
  },
  "expiresInSeconds": 3600,
  "requestsPerMinute": 30
}
```

`resources` requires 1-16 top-level input field names and fixed scalar values (string, finite number, boolean, or null). Every call must contain those exact values. Missing fields, differing types/values, and nested constraints are rejected. Other input fields still follow the reviewed connector's JSON Schema. Resource field names permit ASCII letters, digits, and underscores, starting with a letter; prototype-related names are rejected. String values are bounded to 256 characters.

The reviewed script must use those resource fields to scope its actual reads/writes. The generic runner cannot infer database row ownership, restrict a script's host privileges, or detect a handler that ignores its resource identifiers. Give its private credential profile the minimum backend privileges needed for this scope, including data-source access rules where available.

Optional `profile`, `timeoutMs`, and `resultBytes` select a private core credential profile and reduced execution limits. Profile values never enter the browser. Required connector credentials must exist in that profile. Each capability gets a separate core grant; it inherits neither agent nor local-browser grants.

```sh
npx symbiote-agui connector expose my-workspace save --file private-policy.json
npx symbiote-agui connector status my-workspace
npx symbiote-agui connector unexpose my-workspace save
```

`expose` works while stopped or running. It creates a grant but executes no script. The response's `connectorControl` contains the capability `id`, action, actor label, expiry timestamp, and a random 256-bit `token`. The token is returned once; only its SHA-256 digest is saved. Protect command output and deliver tokens privately to their intended holders. Do not save them in session HTML, metadata, descriptions, Git, provider state, URLs, or shared chat transcripts.

`status` shows exposure policy metadata only through authenticated local control. It never returns tokens or their digests. `unexpose` revokes all public capabilities for that action without revoking its local grants. Use it before reissuing a changed policy or replacing a lost token. `connector revoke`, changed attachment/source updates, and detach revoke public and local access together. The local manager's existing Revoke control does the same; capability issuance uses the CLI.

## Authenticate in the browser

Marked application modules receive `authorizeConnector`, `callConnector`, and `readConnectorReceipt`. They are also exported from `/client/index.js`. Collect the bearer value through an application-owned password input or equivalent private flow, clear the input before continuing, and keep it outside reactive state and mirrored DOM:

```js
// Run from the application's explicit access action; do not embed a real token.
let token = tokenInput.value;
tokenInput.value = '';
let accepted = await api.authorizeConnector('save', token);
token = '';
if (accepted) {
  // Enable the existing connector controls when AGUI_CONNECTORS/connected is true.
}
```

The API sends the token in a WebSocket message, not an HTTP URL or cookie. It resolves to `false` when authentication fails, the connection is unavailable, or the page is a viewer. Successful authentication authorizes the capability; it does not run the action or prove that a later write completed. Keep the existing explicit action and receipt workflow. Headless `agui-connector` uses the same transport once authenticated, with no separate public invocation implementation.

Tokens live only in the current document's private module memory. The API reauthenticates them on a socket reconnect, without rerunning writes. Reload requires private entry again. Receipt recovery is limited to the same capability scope; another actor's capability, a reissued token, or local browser access cannot read its results. Owners can inspect historical outcomes with the core receipt commands. A failed lookup remains uncertain and must not cause automatic replay.

Public transport reports only the authenticated action requirements. Every call/read rechecks current role, origin, capability, expiry, and exact revision. Changing capabilities during a call suppresses its late result; inspect it with its original capability. No browser-supplied actor, execution source, profile, registry path, or grant is accepted.

## Limits and lifecycle

- Expiry is mandatory, between 1 second and 24 hours. Expiry and revocation prevent new calls/receipt reads. Active work is cancelled at expiry; external effects already performed cannot be undone, and the outcome may remain unknown.
- Each session allows 32 private capabilities. Remove old ones with `unexpose` before issuing more. A capability allows 1-120 requests per fixed 60-second window, shared across its sockets. Failed resource checks, duplicate calls, and receipt reads count. Windows reset on worker restart, not on socket reconnect. Reissuing a capability creates a new scope/window.
- Authentication is bounded to 64 attempts per socket and 240 per fixed minute per worker. Existing message-size, pending-call, runner concurrency, deadline, and receipt-capacity limits also apply. This does not replace network-level protection for a heavily exposed service.
- Stop/start retains private policy, its absolute expiry, and grants, while rotating worker identity. Copy, move, rename, clear, and imported definitions transfer no public authority. Resource policy is private, separate from the portable attachment.
- Capabilities bind an exact HTTPS origin, including its port. A renewed tunnel with a different origin needs newly issued capabilities. Existing tokens cannot authorize the replacement origin.
- Review a shared UI and its dependencies before distributing access. Any script executing in its origin can observe credentials entered there. Results published into the UI are visible to its intended viewers; authorization does not make the shared view private.

## Execution boundary

The existing runner executes trusted, reviewed scripts with host-user privileges. Public capabilities constrain who can invoke which reviewed operation; they do not make untrusted scripts safe. No third-party/untrusted script mode is enabled.

OS/container execution would require a separate supported-platform contract for read-only revision mounts, an unprivileged identity, resource limits, controlled filesystem/network access, credential delivery, and process cleanup. A generic Docker flag or Node permission flag would not establish that boundary. Signing could add provenance but would not grant permission. Package dependency installation, scheduled jobs, nested calls, and streaming are independent capabilities and are not enabled by public exposure.

The message authorization and WSS approach follows [OWASP's WebSocket guidance](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html). Node's [permission model](https://nodejs.org/docs/latest-v24.x/api/permissions.html) is an accident-prevention boundary for trusted code, not a malicious-code sandbox.
