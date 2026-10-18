# Quick Tunnels

Each shared session owns one `cloudflared` child exposing only its page server. The CLI control server stays on loopback. A tunnel is ready after the connector reports both its HTTPS hostname and a registered connection. Concurrent shares reuse startup; stopping the session cancels startup and closes the child. Unexpected connector exit removes the allowed public origin and is reported by session status; `share` can create a replacement.

`tunnel renew <SESSION_ID>` replaces the connector without restarting the worker; concurrent renewals share one replacement operation. `tunnel renew all` targets workers already configured for sharing. Replacement closes the previous connector before starting the next, so failure leaves local access available without restoring the old public link.

`status` and `tunnel check` probe the session's `tunnel-health` page endpoint with a fresh nonce and a five-second timeout. A matching session ID and nonce establish reachability; connector readiness alone does not. Activity results include `active`, `checkedAt`, and optional `checkError`. They are checked on demand, with no background keepalive. `tunnel check all` checks shared workers and reports failures independently.

The connector uses an empty configuration in its worker directory so existing user tunnel settings do not affect Quick Tunnel creation. HTTP/2 avoids requiring outbound UDP. Connector output is consumed in its default text format; error details are retained for status and failed commands.

`AGUI_CLOUDFLARED_PATH` selects an executable inherited by new workers. Otherwise AGUI uses `cloudflared` from PATH or downloads a pinned official release into `<state-root>/.bin/cloudflared/`. Platform asset names and SHA-256 checksums live in `constants.js`. Downloads are verified before extraction or execution and published atomically. No system service or account configuration is installed.

Local and public origins are allowed explicitly. Forwarded host/protocol headers do not grant access. Pages connect directly by WebSocket without a browser authorization exchange. The first eligible connection gets the user role; after it disconnects, the next eligible connection or reconnection can take the role. Explicit viewer links never claim it. The server accepts actions and live snapshots only from the user. Viewers receive the latest rendered snapshot through the same WebSocket and run no generated modules. Stylesheet URLs stay relative to each page's origin. Quick Tunnel hostnames are temporary and are recreated after worker restart.
