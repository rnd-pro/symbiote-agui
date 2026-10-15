# Session lifecycle

The CLI reserves a session before spawning its detached worker. The worker owns the page server, control server, and Puppeteer connection. Only the worker closes browser resources: managed Chrome belongs to the session, while an attached browser keeps its other tabs.

Publish reservations by renaming a prepared, nonempty directory into the session's hex-encoded ID path. Keep all mutable data inside a random instance directory. Cleanup removes only that instance, then attempts a nonrecursive removal of the parent. Repeated cleanup from an older instance must preserve a replacement session.

Metadata and logs are private to the OS user. The launcher writes the worker PID before sending the boot message. Startup returns only after the page and authenticated control endpoint are ready; the IPC channel then disconnects so the CLI can exit.

Status and stop validate the control token, instance ID, and worker PID in the reply. A stored PID is used only for liveness checks. Never use it to terminate an unverified process. An unreachable live worker blocks takeover; dead records can be reclaimed by the next start.

Markup uses the same authenticated endpoint and validates reply identity. Each worker serializes insertions, compiles Tailwind classes, publishes the CSS asset, then replaces the page content after stylesheet loading succeeds. A failed update restores the published CSS and leaves the previous content mounted. Shutdown stops accepting updates and waits for the insertion queue before closing browser resources.

`AGUI_STATE_DIR` selects a separate state root for isolated checks. Worker code receives its resolved absolute path and runs in its private instance directory, independent of the caller's project configuration.
