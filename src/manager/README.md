# Built-in session manager

The CLI launches one detached manager per resolved storage scope. Its private `.manager` registry is separate from ordinary sessions, so session bulk operations cannot stop or clear it. The worker pins the library and runtime roots in its environment.

The server serves packaged assets on a dedicated loopback origin. Browser authorization consumes the launch URL fragment and retains the credential in origin-scoped storage. Every WebSocket requires the exact origin and an initial authentication message. HTTP lifecycle requests verify the private credential and process identity. Generated pages and tunnel routes do not carry manager capabilities.

The operation dictionary restricts requests to named session functions. Session mutations are serialized; mutation request IDs retain their result for ten minutes. Worker functions still perform their existing authenticated identity checks. Browser disconnects never cancel or replay accepted operations.

The Symbiote page uses Itemize for rows and refreshes backend state on connection and while visible. It displays Markdown as text. Ordinary refreshes avoid public-network tunnel probes; explicit checks retain health only for the matching public URL. The terminal-style Tailwind theme is compiled once at startup from packaged CSS and HTML, with no build step or CDN. The Theme control supports System, Light, and Dark; preferences use origin-scoped browser storage and synchronize across tabs.
