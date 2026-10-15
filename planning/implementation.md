# AGUI implementation plan

Status: Steps 1-5 completed. Steps 6-7 await approval.

Goal: An agent starts a local UI session, inserts generated markup, and updates interactive content independently of its harness or vendor.

1. Agree on the minimal runtime contract. Completed; see [Runtime contract](../README.md#runtime-contract).
   - Use `symbiote-agui` for the package and CLI; recheck availability before publication.
   - Define session IDs and `start`, `insert`, `status`, and `stop`, with file/stdin input and JSON results.
   - Launch managed Chrome or attach through an explicit CDP endpoint.
   - Use one detached Node worker per session. Confirm dependencies before adding them.

2. Set up the project foundation. Completed; see [Development](../README.md#development).
   - Use JavaScript ESM, JSDoc, shared `types/*.d.ts`, and `checkJs` with `noEmit`.
   - Separate CLI, session management, browser control, and page components by responsibility.
   - Keep Node runtime code directly executable without a build phase.

3. Implement session lifecycle. Completed; see [Session checks](../README.md#session-checks).
   - Start the local JSDA server and a page ready for generated content.
   - Connect Puppeteer Core through CDP and open the session page.
   - Track session connection details; handle duplicate IDs, startup failures, status, and cleanup of owned resources on stop.

4. Implement markup delivery. Completed; see [Markup generation](../README.md#markup-generation).
   - Route `insert` input to the selected session and define whether insertion replaces or appends content.
   - Render standard HTML with Tailwind styling through the JSDA asset workflow.
   - Return clear success or error results to the calling agent.

5. Add Symbiote interactivity. Completed; see [RAT](../README.md#rat).
   - Support RAT templates, reactive bindings, and the README's `use-template` pattern.
   - Provide context through direct component updates and a context-provider supporting inherited and named contexts.
   - Verify bindings and user interaction after repeated markup updates.

6. Write the agent skill and usage instructions.
   - Describe session commands, markup input, RAT, context updates, and error recovery.
   - Include one small interactive example; describe reusable widgets only when implemented.
   - Update the root README in place with setup and usage.

7. Validate the complete workflow.
   - Manually check start, insert, interact, update, status, and stop, including two independent sessions.
   - Run JavaScript type checking. Add focused Node tests for critical session lifecycle and routing behavior; add Puppeteer browser tests when a concrete issue warrants coverage.
   - Keep tests in `tests/node` and `tests/browser` and review each step before proceeding to the next.
