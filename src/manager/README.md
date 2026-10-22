# Built-in session manager

The CLI launches one detached manager per resolved storage scope. Its private `.manager` registry is separate from ordinary sessions, so session bulk operations cannot stop or clear it. The worker pins the library and runtime roots in its environment.

The server serves packaged assets on a dedicated loopback origin. Browser authorization consumes the launch URL fragment and retains the credential in origin-scoped storage. Every WebSocket requires the exact origin and an initial authentication message. HTTP lifecycle requests verify the private credential and process identity. Generated pages and tunnel routes do not carry manager capabilities.

The operation dictionary restricts requests to named session functions. Session mutations are serialized; mutation request IDs retain their result for ten minutes. Worker functions still perform their existing authenticated identity checks. Browser disconnects never cancel or replay accepted operations.

The manager uses uilib layouts, controls, and shared design tokens. JSDA bundles the browser client with one Symbiote instance; Tailwind compiles the page, row, and library templates at startup. Register the manager's context provider before library components so shared bindings connect to the populated context. Session rows use Itemize, descriptions remain plain text, and state refreshes on connection and while visible. Ordinary refreshes avoid public-network tunnel probes; explicit checks retain health only for the matching public URL.

The shared theme toggle selects light/dark. The initial theme follows the OS when no preference is saved. Preferences use origin-scoped browser storage and synchronize across tabs. Restart the manager after template or style changes to rebuild its assets.
