# Private feedback handlers

The agent registers a trusted command through the authenticated worker control server after verifying native delivery to its originating conversation. Registration validates configuration and executable access; it does not prove the command's routing semantics. No harness-specific adapter runs inside AGUI.

`SessionFeedback` owns in-memory registration, ordered submissions, and bounded receipts. Its internal `submit` operation returns a receipt and emits `delivery` when execution finishes. Page transport is separate and is not connected yet. Never pass a page-supplied command or persist registration in session records or definitions.

Keep limits and public failure messages in `constants.js` and contracts in `types/feedback.d.ts`. See the [feedback reference](../../docs/reference.md#private-feedback-handlers) for command configuration, delivery states, and lifecycle boundaries.
