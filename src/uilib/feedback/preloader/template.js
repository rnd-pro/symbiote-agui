import { html } from '@symbiotejs/symbiote/core/html.js';

export let PRELOADER_TEMPLATE = html`
  <progress class="agui-preloader-indicator" bind="@aria-label: progressLabel; @aria-labelledby: progressLabelledBy"></progress>
  <span class="agui-preloader-dots" aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
  </span>
`;
