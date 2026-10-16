# Quick Tunnels

Each shared session owns one `cloudflared` child exposing only its page server. The CLI control server stays on loopback. A tunnel is ready after the connector reports both its HTTPS hostname and a registered connection. Concurrent shares reuse startup; stopping the session cancels startup and closes the child. Unexpected connector exit removes the allowed public origin and is reported by session status; `share` can create a replacement.

The connector uses an empty configuration in its worker directory so existing user tunnel settings do not affect Quick Tunnel creation. HTTP/2 avoids requiring outbound UDP. Connector output is consumed in its default text format; error details are retained for status and failed commands.

`AGUI_CLOUDFLARED_PATH` selects an executable inherited by new workers. Otherwise AGUI uses `cloudflared` from PATH or downloads a pinned official release into `<state-root>/.bin/cloudflared/`. Platform asset names and SHA-256 checksums live in `constants.js`. Downloads are verified before extraction or execution and published atomically. No system service or account configuration is installed.

Local and public origins are allowed explicitly. Forwarded host/protocol headers do not grant access. Browser authorization retains the existing token exchange and adds `Secure` cookies for the public HTTPS origin. Stylesheet URLs stay relative to each page's origin. Quick Tunnel hostnames are temporary and are recreated after worker restart.
