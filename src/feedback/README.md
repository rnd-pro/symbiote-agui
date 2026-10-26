# Private feedback handlers

The agent registers a trusted command through the authenticated worker control server after verifying native delivery to its originating conversation. Registration validates configuration and executable access; it does not prove the command's routing semantics. No harness-specific adapter runs inside AGUI.

`SessionFeedback` owns in-memory registration, ordered submissions, and bounded receipts. Its internal `submit` operation returns a receipt and emits `delivery` when execution finishes; `status` reports availability and queue changes. `PageFeedback` connects explicit submissions and receipt reads over the existing WebSocket, excluding viewers and submissions during agent commands. Never pass a page-supplied command or persist registration in session records or definitions.

The authenticated `POST /feedback/check` control operation validates session/instance identity and compares a supplied conversation ID with the private binding. It returns only readiness, a binding category, and a recommended next action; it does not execute the handler, reveal its route, or alter registration. Disable retains conversation ownership, so a different chat still requires a fresh worker. The CLI's `feedback check` exits 1 when setup is required. This operation is not exposed through the page WebSocket or public status.

Keep limits and public failure messages in `constants.js` and contracts in `types/feedback.d.ts`. See the [feedback reference](../../docs/reference.md#private-feedback-handlers) for command configuration, delivery states, and lifecycle boundaries.
