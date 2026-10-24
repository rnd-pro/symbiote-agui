# AGUI - Agentic Generative User Interface

[![npm version](https://img.shields.io/npm/v/symbiote-agui)](https://www.npmjs.com/package/symbiote-agui)
[![npm downloads](https://img.shields.io/npm/dm/symbiote-agui)](https://www.npmjs.com/package/symbiote-agui)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js 24 or newer](https://img.shields.io/badge/Node.js-%3E%3D24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/en/download)

![Symbiote AGUI](https://rnd-pro.com/idn/4a7be2ee-b771-436e-23a2-4050ffdad800/1024)

> An interactive workspace for your AI conversation.

Symbiote AGUI lets your AI agent create a browser interface for the task you are working on together. Explore data, fill in forms, compare options, or work through a checklist while your agent responds to your choices.

The interface runs on your computer and opens in your normal browser. Your agent handles the interface code and updates it as the task changes.

## Why use AGUI?

- Turn data and long chat responses into dashboards, filters, and comparison views.
- Make choices through forms, buttons, and checklists that your agent can respond to.
- Share a live view with other people while one person interacts.
- Reopen saved interfaces by name for recurring tasks.
- Keep task interfaces and their descriptions in Git so your team can reuse and improve them.

## Get started

You need Node.js 24 or newer and an AI agent that can run shell commands.

Install the [AGUI skill](./skills/symbiote-agui/SKILL.md) for your agent:

```sh
npx skills add rnd-pro/symbiote-agui --skill symbiote-agui
```

Choose your agent in the installer, then ask it for an interface. For example:

> Use Symbiote AGUI to create a weekly planner where I can prioritize tasks and check them off.

Your agent runs AGUI through `npx symbiote-agui` and opens the page for you. Use the interface and continue the conversation whenever you want to change it.

## How it works

You describe a task. Your agent creates a named AGUI session and supplies its interface. The browser shows the result and sends your interactions back to the agent, which can update the page as you work.

AGUI exposes UI actions as WebMCP tools and invokes them through Symbiote.js's public API over WebSockets. Named actions and structured inputs reduce DOM inspection, screenshot analysis, and fragile click sequences, making interaction more efficient and predictable. You keep using your regular browser without drivers or remote debugging, simplifying setup. The control channel stays scoped to the AGUI page and its exposed actions, avoiding the broader browser access that browser automation can require.

AGUI runs locally by default. The CLI is enough to use it; [MCP integrations](./docs/reference.md#optional-agui-mcp) are available for agent environments that support them.

With a verified [private feedback handler](./docs/reference.md#private-feedback-handlers), explicit Save or Submit actions can deliver consolidated changes to the originating conversation. The agent completes the corresponding authorized external operation and verifies the result before marking it saved. Routine edits stay local, and delivery acknowledgement is separate from external persistence. The [agent workflow](./skills/symbiote-agui/SKILL.md#agent-session-feedback) covers setup and behavior when native delivery is unavailable.

## UI library

AGUI includes a reusable UI library that lets agents build dynamic applications declaratively with RAT, using only predefined custom HTML tags and attributes, without needing access to the JavaScript runtime. It speeds up UI generation and significantly reduces token consumption. See the [AGUI skill](./skills/symbiote-agui/SKILL.md#built-in-ui-foundation) for usage guidance.

## Manage sessions in your browser

Open the built-in session manager:

```sh
npx symbiote-agui manager
```

See running and saved interfaces, search their descriptions, and start, stop, sync, clear, or share them directly. The manager refreshes session status automatically and can check or renew public tunnels. It works independently of your agent and stays available when you stop all sessions.

The manager uses the same UI library and theme as generated interfaces. It is local to your computer and uses your current library folder or private cache. See [manager controls](./docs/reference.md#session-manager) for lifecycle commands and access details.

## Internet sharing

Ask your agent to enable a public tunnel and give you a viewer link. AGUI creates the tunnel automatically, without a Cloudflare account or domain.

One person uses the interactive page while others watch its updates through a read-only viewer link. Viewer links stay read-only. When the interactive user disconnects, the next eligible connection can take that role.

If a shared link stops working, run `npx symbiote-agui tunnel check my-workspace` to check it, then `npx symbiote-agui tunnel renew my-workspace` to create replacement links.

Anyone with a public link can open it. Links are temporary, and your computer and AGUI session must remain running. See [sharing behavior and limits](./docs/reference.md#internet-sharing).

## Reopen or finish a session

Browser tabs show the session ID as their title and use a stable colored emoji favicon to help distinguish interfaces.

Ask your agent to reopen a session by name, stop it when you are finished, or clear it when you want to discard the saved interface and data. Reopening restores the interface and explicitly committed data. Ordinary edits remain unsaved until a Save action commits declared provider properties to the [private data cache](./docs/reference.md#local-data-commits).

Data-editing interfaces use one floating toolbar for Save, Cancel changes, and manual JSON import/export. Import stays a draft until Save; export includes unsaved edits and remains available while disconnected. Local saving, agent delivery, and verified external writes have separate statuses.

List all sessions with active/inactive status and current links for running sessions, check one session, or stop it yourself:

```sh
npx symbiote-agui status all
npx symbiote-agui status my-workspace
npx symbiote-agui stop my-workspace
```

Run `npx symbiote-agui start all` to reopen all saved sessions, reusing those already running. To stop every session and its tunnel while keeping saved interfaces, run `npx symbiote-agui stop all`.

## Build a shared team library

Choose a folder inside your team's Git checkout:

```sh
npx symbiote-agui config folder ./aguis
```

AGUI saves each interface as an HTML file with a Markdown description. Include the folder and `.agui.json` in your normal Git workflow. Your agent can discover an existing interface, adapt it as the task evolves, and load your teammates' changes. Runtime connections and control tokens stay on your computer.

Without a folder setting, AGUI keeps using its private cache. See the [team library guide](./docs/library.md) for discovery, descriptions, and syncing running interfaces.

Sessions can also describe their initial data source, provider bindings, and intended destinations. Inspect this through `describe`, search it with `list --query`, or view it in the manager. The [metadata commands](./docs/reference.md#session-data-flow-metadata) maintain this information privately without changing application data or starting a worker.

## Built with

[Symbiote.js and Runtime Agnostic Templates (RAT)](https://github.com/symbiotejs/symbiote.js#runtime-agnostic-templates-rat) provide reactive interfaces built from portable HTML templates. [JSDA-Kit](https://github.com/rnd-pro/jsda-kit) serves pages and assets on demand, keeping AGUI ready to run without a separate application build setup.

## Learn more

- [Session controls, sharing limits, and optional integrations](./docs/reference.md)
- [AGUI skill for agents creating and operating interfaces](./skills/symbiote-agui/SKILL.md)
- [Package on npm](https://www.npmjs.com/package/symbiote-agui)

## Contributing

Bug reports, ideas, and focused pull requests are welcome. Read the [contributing guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

## License

**MIT** &copy; [RND-PRO.com](https://rnd-pro.com/)
