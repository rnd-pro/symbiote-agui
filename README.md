# AGUI - Agentic Generative User Interface

[![npm version](https://img.shields.io/npm/v/symbiote-agui)](https://www.npmjs.com/package/symbiote-agui)
[![npm downloads](https://img.shields.io/npm/dm/symbiote-agui)](https://www.npmjs.com/package/symbiote-agui)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node.js 24 or newer](https://img.shields.io/badge/Node.js-%3E%3D24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/en/download)

> An interactive workspace for your AI conversation.

Symbiote AGUI lets your AI agent create a browser interface for the task you are working on together. Explore data, fill in forms, compare options, or work through a checklist while your agent responds to your choices.

The interface runs on your computer and opens in your normal browser. Your agent handles the interface code and updates it as the task changes.

## Why use AGUI?

- Turn data and long chat responses into dashboards, filters, and comparison views.
- Make choices through forms, buttons, and checklists that your agent can respond to.
- Share a live view with other people while one person interacts.
- Reopen saved interfaces by name for recurring tasks.

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

AGUI runs locally by default. The CLI is enough to use it; [MCP integrations](./docs/reference.md#optional-agui-mcp) are available for agent environments that support them.

## Internet sharing

Ask your agent to enable a public tunnel and give you a viewer link. AGUI creates the tunnel automatically, without a Cloudflare account or domain.

One person uses the interactive page while others watch its updates through a read-only viewer link. Viewer links stay read-only. When the interactive user disconnects, the next eligible connection can take that role.

Anyone with a public link can open it. Links are temporary, and your computer and AGUI session must remain running. See [sharing behavior and limits](./docs/reference.md#internet-sharing).

## Reopen or finish a session

Ask your agent to reopen a session by name, stop it when you are finished, or clear it when you want to discard the saved interface. Reopening restores the interface definition; previous inputs and task progress are not saved automatically.

List all sessions with active/inactive status and current links for running sessions, check one session, or stop it yourself:

```sh
npx symbiote-agui status all
npx symbiote-agui status my-workspace
npx symbiote-agui stop my-workspace
```

Run `npx symbiote-agui start all` to reopen all saved sessions, reusing those already running. To stop every session and its tunnel while keeping saved interfaces, run `npx symbiote-agui stop all`.

## Built with

[Symbiote.js and Runtime Agnostic Templates (RAT)](https://github.com/symbiotejs/symbiote.js#runtime-agnostic-templates-rat) provide reactive interfaces built from portable HTML templates. [JSDA-Kit](https://github.com/rnd-pro/jsda-kit) serves pages and assets on demand, keeping AGUI ready to run without a separate application build setup.

## Learn more

- [Session controls, sharing limits, and optional integrations](./docs/reference.md)
- [AGUI skill for agents creating and operating interfaces](./skills/symbiote-agui/SKILL.md)
- [Package on npm](https://www.npmjs.com/package/symbiote-agui)
