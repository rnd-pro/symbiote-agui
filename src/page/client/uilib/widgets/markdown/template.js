import { html } from '@symbiotejs/symbiote/core/html.js';

export let MARKDOWN_TEMPLATE = html`
  <p role="status" aria-live="polite" bind="textContent: statusMessage; hidden: !statusMessage"></p>
  <article ref="body" class="agui-markdown-content" bind="@aria-label: documentLabel; @aria-busy: busy; hidden: contentHidden"></article>
`;
