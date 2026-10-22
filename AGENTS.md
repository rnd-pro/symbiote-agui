# Project instructions

Read [README.md](./README.md) for the project purpose and main workflows.

## Workflow

- When the user asks a question, answer it. Make code changes or perform a deeper investigation only when requested.
- Implement only the authorized scope. A direct request to implement a task or named stage authorizes that work. Proposed multi-stage plans need explicit approval before implementation; do not ask again for approval already given.
- Split large tasks into small, reviewable stages. Maintain the task's authoritative plan as a Markdown file in `planning/`, updating it in place. Do not create separate stage completion reports or duplicate planning documents.
- Do not add project dependencies without explicit user confirmation. Reuse existing dependencies and platform capabilities.
- Leave Git mutations, including staging, commits, merges, and pushes, to the user. Read-only Git inspection is allowed; the user performs the final Git review.
- At task completion, ask for review and suggest a commit message for any changes made.

## Code conventions

- Use modern JavaScript, ESM, `.js` file extensions, single-quoted JavaScript strings, and semicolons. Do not use CommonJS or introduce a build phase for Node.js runtime code.
- Use JSDoc for JavaScript types, with `checkJs: true` and `noEmit: true`. Put shared or complex type definitions in `types/*.d.ts`. Put each JSDoc parameter on its own line.
- Define each shared data model and its types in one authoritative location. Keep definitions with a single consumer near that consumer. Reuse shared types, enums, and dictionaries instead of duplicating them across modules.
- Search for existing components, utilities, models, and definitions before creating equivalents.
- Split code by functional responsibility and keep the hierarchy easy to navigate. Keep source files, classes, and functions under 500 lines; split earlier when responsibilities or readability require it.
- Prefer `let`. Use `const` when preventing reassignment expresses an intentional invariant in the logic.
- Prefer object lookups for mapping known keys to values or handlers. Use `switch` only when it provides a demonstrated, noticeable performance benefit.
- Format array and object literals across multiple lines, even when short. Put each item or property on its own line and closing brackets/braces on separate lines. Apply the same rule to destructuring patterns and named import/export lists.
- Format CSS rules across multiple lines, with each declaration and closing brace on its own line. Put declarations in inline style attributes on separate lines when there is more than one. JavaScript style objects follow the object formatting rule.
- Prefer clear names and function signatures. Use comments to explain non-obvious intent or constraints, and keep the implementation simple enough for a human developer to maintain. Follow KISS and DRY.

## Symbiote and uilib

- Before implementing component behavior, consult `node_modules/@symbiotejs/symbiote/llms.txt` and the relevant documentation in that package. Prefer native Symbiote APIs. Before adding a helper or wrapper, verify that Symbiote does not already provide that capability. If the contract is unclear, inspect its implementation before proceeding.
- Never hardcode user-facing text in uilib components, including labels, accessible names, hints, statuses, errors, and fallback messages. Supply text through host attributes or native Symbiote bindings. Keep application copy outside uilib and preserve caller-provided text bindings.

## Validation

- Run existing checks that directly cover the changed behavior. For JavaScript or type changes, run `npm run types`. Keep validation proportional to the task; avoid unrelated or repeated checks without a new reason.
- Prefer user manual review for appearance, layout, animation, mobile behavior, and external browsers with active sessions. State what needs manual verification. Do not create automated style tests.
- Add automated tests for a concrete bug found during implementation or reported by the user, or for critical system behavior. Do not add tests for every routine change or follow TDD by default.
- Use Node.js's built-in test runner and the existing Puppeteer dependency for browser tests. Keep tests in `tests/node` and `tests/browser`; do not add another test library for capabilities already available.

## Documentation

- Keep project documentation and shared instructions concise and update them in place. Avoid duplicate explanations and routine progress notes so the project context stays compact for people and agents.
- Add a nested `README.md` when a folder needs navigation guidance, setup instructions, important settings, or an explanation of architectural decisions. File count alone is not a reason. Do not write a folder inventory or update log.
- Keep the root README abstract and focused on project purpose, benefits, and main user workflows. Do not include implementation details, API contracts, or inventories of evolving features such as uilib components. Describe their value briefly and link to dedicated docs or the skill for usage details.
- Keep public project docs, distributed skills, and shared instructions focused on the reusable tool. Do not copy local task/session artifacts, user data, real external resource IDs, machine-specific paths, live session URLs, or local investigation results into them. Keep those details in local session artifacts; use fictional examples or explicit placeholders in public materials. Check this boundary when reviewing documentation changes.
- Prefer lists and short prose over Markdown tables for easier source review. Prefer standard keyboard punctuation; avoid decorative Unicode arrows, typographic dashes, or bullet symbols in project Markdown prose.
