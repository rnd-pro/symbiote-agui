# Declarative local backend actions

`agui-connector` is a headless Symbiote owner for one attached action. It renders authored children without adding controls, wrappers, copy, or styles. Bind JSON `input`, invoke `run` explicitly, and publish successful output with `pub-to`. No session module is required.

```html
<agui-connector action="save" pub-to="APP/records" bind="$.input: APP/draft">
  <agui-toolbar aria-label="Record actions">
    <button type="button" bind="onclick: ^run; disabled: ^unavailable">Save</button>
    <button type="button" bind="onclick: ^read_receipt; disabled: ^receiptUnavailable">Check outcome</button>
    <agui-preloader label="Saving" bind="hidden: !^pending"></agui-preloader>
  </agui-toolbar>
  <p role="status">{{outcome}}</p><p role="alert">{{error}}</p>
</agui-connector>
```

Declare the context and attach, review, and grant the backend before invocation. Supply labels and error-code translations in application markup/state, composing existing state/message components. `error` contains a stable code, not built-in copy.

Bindings directly in the connector use local keys such as `run`. Inside another uilib owner such as `agui-toolbar`, use native pop-up keys (`^run`, `^pending`) to reach the connector instead of creating a second local property.

## State and actions

- `action`: property or host attribute naming the session action. It cannot choose a module, source path, credentials, or authority.
- `input`: incoming JSON, captured once per call. Binding updates and typing never invoke it.
- `value`: latest successfully published output. `pub-to` receives only a completed, current result.
- `pending`: awaiting a call/receipt response. `outcome` is `idle`, `running`, `completed`, `rejected`, or `unknown`. `result` retains receipt metadata/output, captured `inputRevision`, and `stale`.
- `requestId`: immutable operation ID. Retain it outside the component when recovery must survive replacement or full reload.
- `stale`: input, action, or reviewed revision changed during the request. Its result stays inspectable but never publishes over a newer draft.
- `unavailable`: run is disabled while disconnected, missing an action, disabled/read-only, awaiting a response, or holding a running/unknown outcome. `receiptUnavailable` controls receipt reads. `disabled` and `readonly` accept properties or boolean attributes.
- `run`: native `ToolDescriptor` callable through `onclick: run`; starts one new request. `read_receipt` reconciles that request without resubmitting. Discover actual scoped tool names through the normal catalog.

Browser events/tools use an `agui` grant. Agent commands intentionally cannot trigger browser writes; use authenticated `connector call` with an `agent` grant. Tool discovery and visible controls confer no authority; the server enforces access.

Add `load` only for a read action that should run once on first readiness. Writes reject it with `AUTOLOAD_WRITE_DENIED`. Input changes and reconnects never repeat it. A newly created component may perform its own explicitly enabled initial read.

## Recovery and saving

Disconnect preserves uncertainty. Reconnection to the same unchanged worker render retains the component and draft. The shared bridge reads receipts; the component accepts only its request/action and checks captured input before publishing. Explicit receipt reads can check running outcomes again. A failed lookup stays unknown. Resolve uncertain writes before another one; never automatically replace them with new request IDs.

Destruction releases native subscriptions and ignores late results. It does not cancel accepted work or imply rollback; reconcile the retained request through the CLI after removing the component.

This component does not commit the local cache or send chat feedback. Choose the saving flow in the session description. Add the data toolbar only when its separate workflow is needed, avoiding duplicate external writes.

See [backend setup](../../../../docs/connectors.md) and the [runnable example](../../../../docs/examples/connectors/README.md).
