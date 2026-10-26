import { html } from '@symbiotejs/symbiote/core/html.js';

export let MARKDOWN_TEMPLATE = html`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <article ref="body" class="agui-markdown-content" bind="@aria-label: documentLabel; @aria-busy: busy; hidden: contentHidden"></article>
`;
