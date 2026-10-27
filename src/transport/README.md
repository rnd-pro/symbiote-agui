# Page transport

Pages use the existing session WebSocket. `types/transport.d.ts` defines the wire messages; `constants.js` owns shared limits. `PageConnection` enforces origins, connection membership, and user/viewer capabilities. Application commands, data commits, feedback, mirrored snapshots, and transient annotations have separate dispatch paths.

## Annotation packets

The annotation transport is available only on shared sessions. The trusted page client renders colored viewer marker cursors outside application content and keeps their packets separate from application commands. The mirror stays inert and has no application scripts; trusted parent listeners handle hover and presentation-only scrolling.

- The server assigns each connected viewer a public ID and color. These are separate from private page/control identities. An interactive user receives annotations but cannot publish them.
- Client packets use `type: "annotation"`, current markup `revision`, current snapshot `viewSequence`, and a positive, monotonically increasing `sequence` per connection. Unknown properties, including supplied identity, color, and timestamps, are rejected.
- `action: "cursor"` carries `point: { anchor, x, y }` or `null` when leaving the surface. Anchor IDs contain 1-64 ASCII letters, digits, underscores, or hyphens; finite coordinates are normalized to 0-1. Only anchors declared by the active user in the current snapshot are accepted. Cursor publication coalesces to about 30 packets per second.
- `action: "stroke"` carries `phase: "start"`, `"append"`, or `"end"`, and a bounded `points` array. Only end packets may have no points. There is one active stroke per viewer. Appends without a start are ignored; expired active segments can resume while the pointer remains held.
- `action: "sync"` requests current annotation state. Duplicate sequence numbers, obsolete revisions, and excess-rate packets are dropped without becoming application events.

Server packets use `type: "annotations"` with current `revision`, `viewSequence`, and server `time`. Actions are `state`, `join`, `leave`, `cursor`, `stroke`, `remove`, `reset`, and `view`. Bootstrap/recovery state includes `self`, current viewer presence, and unexpired strokes. A user has `self: null`; a viewer beyond the annotation participant limit also has `self: null` and continues viewing without publication capability.

Stroke packets contain server-owned identity, color, timestamps, expiry, and an `ended` flag. `startSequence` identifies the originating start packet across automatic segment splits; `sequence` identifies the latest applied packet. These allow clients to reconcile immediate local previews with confirmed strokes without drawing both. `append: false` starts a segment; `append: true` adds its packet's points to that segment. A final append with no points marks it ended. Recovery state always contains complete strokes. Client sequence numbers are not snapshot sequence numbers.

## Snapshot positioning

Role messages expose the current `viewSequence`. An active user publishes a greater snapshot `sequence` with a `rootAnchor` and at most 10,000 distinct `anchors`. Snapshots without this metadata remain compatible but provide no annotation targets. Duplicate/obsolete snapshot sequences are ignored.

The client assigns stable opaque anchor IDs through a WeakMap, adds their attributes only to cloned markup, and retains a bounded reverse map for projection on the live page. Map transformations and hoisted dialogs/popovers keep their identities; transparent table hosts do not become anchors. Snapshot replacement preserves each viewer's own nested scroll offsets. Positions reproject against each visitor's visible element bounds instead of viewport percentages; missing or clipped anchors are hidden.

The marker layer reuses the bundled icon, native keyed Itemize, and non-interactive manual popovers. It is outside mirrored content, has no application actions, does not capture user controls or focus, and is never included in a snapshot. Pointer movement updates locally before network confirmation; remote positions interpolate unless reduced motion is requested. Disconnect clears marker state, listeners, observers, pending packets, and animation frames.

## Transient drawing

Viewers draw with the primary mouse button. Touch and pen drawing require the existing data toolbar's drawing toggle, bound to reserved `AGUI_SESSION/annotationDrawing` state. The toggle is available only when annotation targets and a viewer identity exist. Drawing mode preserves pinch zoom; leaving it restores ordinary touch scrolling. The interactive user keeps normal controls.

Native Pointer Events feed bounded local previews and shared-socket batches. Release, cancellation, lost capture, leaving the surface, and tab suspension end drawing. Disconnect discards unsent work. Ordinary snapshots retain valid trails and rebase a held pointer to the current view; removed anchors retire their trails. Old queued points are never replayed after reconnect.

A single Canvas 2D surface shares the marker animation loop. Rounded 18 CSS px trails use 30% opacity on the complete surface so overlapping samples remain translucent. Shared rendering defaults live in `src/page/client/markers/constants.js`; timing limits remain in `constants.js`. Canvas backing storage is capped at 4,194,304 pixels and device scale 2. Local previews and confirmed history share the segment/point budgets below.

Trails hold for 3 seconds and fade for 2 seconds. Timestamp-based expiry catches up after background suspension. Reduced-motion mode removes trails at expiry without gradual fading. The canvas stops redrawing unchanged held trails and releases its backing storage on disconnect. Drawing and the toolbar toggle never become application actions, feedback, or saved provider data.

## Bounds and lifecycle

- Incoming packets: 8 KiB, 40 packets per second per registered viewer, and 32 points per packet. Annotation payload validation is in `annotations.js`.
- At most 128 annotation participants, 64 retained stroke segments, and 4,096 retained stroke points per session. Oldest segments are evicted when storage limits are reached.
- Segments split after 256 points or 2 seconds, preserving their connecting point. Expiry uses 3 seconds of hold time plus 2 seconds for fading, from the latest update or explicit end. Disconnect ends active strokes without extending their remaining lifetime.
- Slow recipients do not accumulate annotation packets. Above 64 KiB of socket buffering, the server retains only a recovery flag and sends current bounded state when the connection catches up.
- A 250 ms sweep removes expired history and retries recovery. Markup replacement clears positions and strokes; disconnect removes presence; reconnect gets a fresh public identity. Closing the session disposes timers and memory.

Annotations never write provider data, session definitions, metadata, saved data, feedback, or the application event log. Their state exists only in the owning worker's memory.
