# Session data-flow metadata

Metadata is descriptive, not executable configuration or application state. Keep its schema in `types/metadata.d.ts` and endpoint kinds/limits in `constants.js`. Validation accepts only declared fields; adding metadata cannot grant permissions or register a feedback command.

Storage uses `<private-state-root>/.metadata/<encoded-session-id>.json`. `getStateRoot()` supplies the existing library namespace; worker instance directories and shared HTML/Markdown do not own this file. Reuse atomic text-file publication and preserve the read snapshot when preparing updates so detected intervening edits fail explicitly. Stop/start and source sync retain metadata; session clear deletes it.

Discovery and the local manager read the same store. Keep display formatting browser-safe and render descriptions as plain text. Missing metadata means an empty object; malformed stored metadata reports a cache error instead of silently losing its source/target information. See the [metadata commands](../../docs/reference.md#session-data-flow-metadata) for the public schema and lifecycle.
