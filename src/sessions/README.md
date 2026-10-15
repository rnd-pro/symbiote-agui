# Session lifecycle

The CLI reserves a session before spawning its detached worker. The worker owns a JSDA page server, an authenticated control server, a WebSocket connection manager, and the latest accepted markup. The CLI opens the returned URL through the OS default browser unless `--no-open` is used. Browser processes and tabs belong to the user.

Publish reservations by renaming a prepared, nonempty directory into the session's hex-encoded ID path. Keep mutable data inside a random instance directory. Cleanup removes only that instance, then attempts a nonrecursive removal of its parent. Old cleanup must preserve a replacement session.

Metadata and logs are private to the OS user. The launcher writes the worker PID before sending the boot message. Startup returns after both servers are listening, then disconnects IPC so the CLI can exit. A separate page token in the URL fragment authorizes same-origin WebSocket connections; never expose the CLI control token to the page.

Status, input, event retrieval, and stop validate the control token, instance ID, and worker PID. Stored PIDs are used only for liveness checks. An unreachable live worker blocks takeover; dead records can be reclaimed by the next start.

The worker serializes insertions, state commands, and page restoration. Markup is validated and its classes compiled without a browser. Connected pages acknowledge delivery; without pages, insertion queues the latest markup in memory. A failed delivery retains the previous accepted snapshot. Events use a bounded queue and are drained by the agent's CLI.

Stop sends a session-ended notification, closes sockets and servers, and releases metadata. It never closes browser tabs. `AGUI_STATE_DIR` selects a separate state root; the worker receives its resolved absolute path and runs inside its instance directory.
