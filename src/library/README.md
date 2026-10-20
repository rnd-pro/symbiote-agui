# Saved definitions

Storage paths resolve from `AGUI_LIBRARY_DIR`, the nearest `.agui.json`, or the private cache. Team definitions use readable HTML/Markdown pairs; private definitions use encoded IDs. Runtime state is separate and scoped to the library's canonical path.

Prepared writes preserve an existing description, check for intervening file changes, and publish HTML atomically. Syncing reads saved source in the worker's update queue without publishing it again. Keep file operations here so CLI saves and browser insertions follow the same rules.

See the [team library guide](../../docs/library.md) for configuration, discovery, and Git workflow.
