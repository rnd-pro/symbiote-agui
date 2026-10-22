# Local data persistence

Declare `persist="key otherKey"` on a named JSON-backed provider. The worker validates declarations in accepted markup; browser requests contain provider keys and JSON values, never paths or markup. Native Symbiote contexts own drafts. The browser API captures a clone without modifying live values when the write completes.

`SessionData` serializes commits with session updates and checks worker, markup, and data revisions. Acknowledgement follows atomic private HTML publication. `.runtime/<session-key>.html` contains a versioned header and the accepted markup with updated inline JSON; source definitions and metadata stay separate. Stop retains snapshots, clear removes them, and compatible source replacement merges committed properties. Incompatible changes require explicit reconciliation or `sync --reset-data`.

Receipts are bounded worker memory, not a durable log. Reconnect reads outcomes without replay; unknown outcomes require inspecting saved data before another write. `PageData` rejects commits during pending page commands so a command cannot await its own session queue. Receipt reads remain independent of that queue.

See the [public contract](../../docs/reference.md#local-data-commits) for browser APIs, limits, and lifecycle behavior. Feedback and external persistence are separate operations.
