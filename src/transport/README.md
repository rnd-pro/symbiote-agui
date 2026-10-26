# Page transport

Pages use the existing session WebSocket. `types/transport.d.ts` defines the wire messages; `constants.js` owns shared limits. `PageConnection` enforces origins, connection membership, and user/viewer capabilities. Application commands, data commits, feedback, mirrored snapshots, and transient annotations have separate dispatch paths.

## Annotation packets

The annotation transport is available only on shared sessions. The current browser client recognizes its server packets without routing them into application commands; pointer capture and rendering are separate client features.

- The server assigns each connected viewer a public ID and color. These are separate from private page/control identities. An interactive user receives annotations but cannot publish them.
- Client packets use `type: "annotation"`, current markup `revision`, and a positive, monotonically increasing `sequence` per connection. Unknown properties, including supplied identity, color, and timestamps, are rejected.
- `action: "cursor"` carries `point: { anchor, x, y }` or `null` when leaving the surface. Anchor IDs contain 1-64 ASCII letters, digits, underscores, or hyphens; finite coordinates are normalized to 0-1. This validates the coordinate envelope, not whether an anchor exists in a rendered snapshot.
- `action: "stroke"` carries `phase: "start"`, `"append"`, or `"end"`, and a bounded `points` array. Only end packets may have no points. There is one active stroke per viewer. Appends without a start are ignored; expired active segments can resume while the pointer remains held.
- `action: "sync"` requests current annotation state. Duplicate sequence numbers, obsolete revisions, and excess-rate packets are dropped without becoming application events.

Server packets use `type: "annotations"` with current `revision` and server `time`. Actions are `state`, `join`, `leave`, `cursor`, `stroke`, `remove`, and `reset`. Bootstrap/recovery state includes `self`, current viewer presence, and unexpired strokes. A user has `self: null`; a viewer beyond the annotation participant limit also has `self: null` and continues viewing without publication capability.

Stroke packets contain server-owned identity, color, timestamps, expiry, and an `ended` flag. `append: false` starts a segment; `append: true` adds its packet's points to that segment. A final append with no points marks it ended. Recovery state always contains complete strokes. Client sequence numbers are not snapshot sequence numbers.

## Bounds and lifecycle

- Incoming packets: 8 KiB, 40 packets per second per registered viewer, and 32 points per packet. Annotation payload validation is in `annotations.js`.
- At most 128 annotation participants, 64 retained stroke segments, and 4,096 retained stroke points per session. Oldest segments are evicted when storage limits are reached.
- Segments split after 256 points or 2 seconds, preserving their connecting point. Expiry uses 3 seconds of hold time plus 2 seconds for fading, from the latest update or explicit end. Disconnect ends active strokes without extending their remaining lifetime.
- Slow recipients do not accumulate annotation packets. Above 64 KiB of socket buffering, the server retains only a recovery flag and sends current bounded state when the connection catches up.
- A 250 ms sweep removes expired history and retries recovery. Markup replacement clears positions and strokes; disconnect removes presence; reconnect gets a fresh public identity. Closing the session disposes timers and memory.

Annotations never write provider data, session definitions, metadata, saved data, feedback, or the application event log. Their state exists only in the owning worker's memory.
