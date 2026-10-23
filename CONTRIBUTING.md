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

Run all Node tests with `npm run test:node`. Browser tests use an installed Chrome or Chromium executable through Puppeteer. Set `AGUI_TEST_BROWSER_PATH` to its absolute path, then run:

```sh
npm run test:browser
```

Browser checks are skipped when that variable is unset. They start local servers and browser processes, so the environment must permit both. Restart the manager after changing its templates or styles to rebuild its assets.

Add tests for concrete bugs and critical behavior. Review appearance, animation, and narrow layouts manually; do not add automated style assertions. Check whitespace with `git diff --check`.

## Submit a pull request

Explain the problem and resulting behavior, link the relevant issue, and list the checks you ran. Include screenshots or manual review notes for visible changes. Mention any checks you could not run and why.

Update relevant documentation alongside behavior changes. Keep dependency and lockfile changes intentional, and leave unrelated formatting or refactoring for a separate pull request.

Contributions are made under the repository's [MIT license](./LICENSE).
