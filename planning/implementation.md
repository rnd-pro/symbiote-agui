# AGUI implementation plan

Status: Completed. Type checking, 16 Node tests, 3 Puppeteer tests, and a default-browser WebSocket walkthrough passed.

Goal: An agent starts a local UI session, inserts generated markup, and updates interactive content in a regular browser page independently of its harness or vendor.

1. Define the runtime contract in the root [README](../README.md#runtime-contract).
   - Use `symbiote-agui` for the package and CLI.
   - Keep session IDs, JSON results, and file/stdin input.
   - Open the OS default browser; support `--no-open` and a reusable URL.

2. Keep the project foundation compact.
   - Use JavaScript ESM, JSDoc, shared declarations, `checkJs`, and `noEmit`.
   - Run Node code directly without a build phase.
   - Use Puppeteer only for development tests.

3. Manage independent session workers.
   - Reserve IDs atomically and authenticate CLI control requests.
   - Serve the page and WebSocket connection on loopback.
   - Report connected page counts and stop without owning browser processes or tabs.

4. Deliver and retain markup.
   - Validate fragments and collect Tailwind classes on the server.
   - Apply updates through the page runtime and await acknowledgements.
   - Retain the latest accepted markup for queued delivery, reload, and reconnect.

5. Support interactivity through existing Symbiote APIs.
   - Preserve RAT templates, inherited/named contexts, and `use-template`.
   - Mount explicitly marked inline modules for handlers and cleanup.
   - Provide JSON state commands and a bounded event queue for the agent.

6. Maintain the [agent skill](../skills/symbiote-agui/SKILL.md) and usage instructions.
   - Document regular-page setup, commands, modules, state, events, and recovery.
   - Include a small interactive example in the skill and root README.

7. Validate the workflow.
   - Check two independent sessions, regular-page connections, interaction, state updates, and events.
   - Check queued markup, reload/reconnect, acknowledgements, and shutdown without closing tabs.
   - Run type checking and focused Node/Puppeteer tests for transport and lifecycle behavior.
