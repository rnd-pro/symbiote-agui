# Session transfers

Transfers copy saved HTML, its Markdown description, portable policies, and the owned asset tree between registered scopes. Private metadata and committed data are separate opt-in artifacts. Data uses the existing validated runtime-cache format with a fresh destination revision; browser drafts and worker control state are excluded.

Mutations share case-folded session storage locks with saves, metadata updates, starts, clears, and worker queues. Two-scope operations acquire locks in a fixed order. Live copies first request a serialized worker snapshot, then verify the files under both locks. Moves require a stopped source. Files must be regular artifacts rather than symbolic links.

Session ID rename reuses a move within the current scope, always including committed data and private metadata. The CLI and authenticated manager share `renameSession`; manager UI reuses the transfer dialog. Rename never stops a worker, overwrites destination artifacts, rewrites authored references, or changes a Markdown display title. The renamed asset directory retains its relative `_assets` URLs.

Each operation retains a private receipt and staged artifacts under the base state directory's `.transfers` folder. Destination files are staged on their own filesystem and published exclusively, with HTML last. A verified destination precedes any move cleanup. Source files are backed up privately, then renamed and checked before removal so edits encountered during cleanup remain recoverable.

Version 2 receipts include bounded asset manifests and publication/restoration directory identities; binary bytes stay in private backup directories. Asset directories are created exclusively before HTML publication and never merged with existing trees. Recovery accepts verified partial publication, deletion, and restoration, but refuses changed bytes or unowned directories. Version 1 receipts remain readable and recoverable without assets. Older live workers may copy asset-free definitions; workers without asset snapshots must be stopped or restarted before copying an asset tree.

Pending markers prevent writes or starts against incomplete destinations and move sources. Recovery is explicit through the manager's Projects / Transfers view: restore missing move sources and remove unchanged destination artifacts. Changed files stop recovery for reconciliation. A completed receipt only needs marker cleanup; it is never silently rolled back. Private backups, including data or metadata excluded from a move, remain available at the result's backup path.

Static markup, styles, and relative module imports are checked for missing destination dependencies. The virtual `_assets` prefix resolves against the captured asset manifest, not a literal destination folder. Dynamic references require review. Transfers do not copy unrelated files, rewrite application references, perform Git operations, or synchronize external data sources.
