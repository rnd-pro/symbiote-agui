# Contributing to Symbiote AGUI

Bug reports, focused fixes, documentation improvements, and ideas for better agent interfaces are welcome. Please follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Report a problem or suggest a feature

Search [existing issues](https://github.com/rnd-pro/symbiote-agui/issues) before opening a new one. Use the bug report or feature request form and describe the task you were trying to complete.

For bugs, include reproducible steps, expected and actual behavior, the package and Node.js versions, and your operating system. Include browser and agent details when relevant. A small HTML example or CLI sequence is often enough to reproduce a problem.

Remove credentials, launch URL fragments, private data, and live tunnel links from reports, logs, and screenshots. Send suspected security vulnerabilities privately to [team@rnd-pro.com](mailto:team@rnd-pro.com) rather than posting exploit details in a public issue.

For substantial changes or new dependencies, discuss the approach with maintainers before starting implementation.

## Work on the code

Use Node.js 24 or newer. Fork the repository, clone your fork, then install the locked dependencies:

```sh
npm ci
```

Run the CLI from your checkout with `npm start --`, for example:

```sh
npm start -- manager
```

Read [AGENTS.md](./AGENTS.md) for the project's code, documentation, and validation conventions. Use JavaScript modules and JSDoc types, reuse existing utilities, and prefer Symbiote's public APIs for component behavior. Keep UI library text supplied by callers and use the shared design tokens.

Keep changes focused on one problem. Public documentation and examples should use fictional data and portable paths, without local session artifacts or credentials.

## Validate your changes

For JavaScript or type changes, run:

```sh
npm run types
```

Run the tests that cover the changed behavior. Node tests use the built-in test runner:

```sh
node --test tests/node/manager.test.js
```

Run all Node tests with `npm run test:node`.

After changing shared uilib CSS, templates, or state-dependent utility classes, run `npm run uilib:styles` to regenerate the browser stylesheets in `uilib/dist/`. Packaging also runs this generator. Keep shared rules and tokens in their source files; do not edit generated CSS. Use `npm run gallery:styles` when changing utility classes in gallery sections.

Run `npm run templates:styles` after changing utility classes in app template chunks. It reuses the gallery's utility compiler and updates each starter's owned `styles.css`; packaging runs it automatically. Keep template styling in the existing library components and design tokens.

Use `npm run templates:previews` to refresh gallery screenshots and configuration snippets from each starter's `preview.json`. It uses the existing test browser and isolated temporary storage, leaving user sessions untouched. Preview fixtures must be task-neutral and separate from creation defaults. Review the generated screenshots manually; packaging does not launch a browser to regenerate them.

Use `npm run templates:compare` to compare a fixed notes workspace authored as HTML with the workspace starter configured through JSON. It verifies both versions in the test browser and writes authored bytes, LOC, setup commands, and CLI timings to `TMP/benchmarks/templates/comparison.json`. Discovery costs are separate; these reference fixtures do not measure model tokens or authoring time.

Run `npm run uilib:build` after changing library JavaScript or public types. It regenerates the split browser graph, stylesheets, Leaflet assets, and declarations using the installed JSDA toolchain and TypeScript. `npm pack` runs this build automatically. Keep registration tags in the source entry and model declarations in `uilib/types/`; generated exports follow those sources.

Run `npm test` for both suites without additional setup. Downloads require network access on the first run; subsequent runs reuse the cached browser.

Before release, run `npm run test:package`. It installs the production tarball in a temporary npm cache outside the checkout and verifies CLI, MCP, manager assets, and project operations without development dependencies in that installation. It creates each starter in Default and project storage and checks its assets, bindings, and widgets in the checkout's test browser. It also checks library consumption, declarations, and deferred widgets from a separate static origin. It requires npm registry access. Run packaging and library builds separately from server/browser tests: rebuilding replaces the distribution those tests serve.

Add tests for concrete bugs and critical behavior. Review appearance, animation, and narrow layouts manually; do not add automated style assertions. Check whitespace with `git diff --check`.

## Submit a pull request

Explain the problem and resulting behavior, link the relevant issue, and list the checks you ran. Include screenshots or manual review notes for visible changes. Mention any checks you could not run and why.

Update relevant documentation alongside behavior changes. Keep dependency and lockfile changes intentional, and leave unrelated formatting or refactoring for a separate pull request.

Contributions are made under the repository's [MIT license](./LICENSE).
