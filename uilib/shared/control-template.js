import { html } from '@symbiotejs/symbiote/core/html.js';

export let CONTROL_LABEL = html`<span ref="label" class="inline-flex gap-1 text-sm text-agui-text" bind="hidden: !fieldLabel"><span bind="textContent: fieldLabel"></span><span aria-hidden="true" bind="textContent: fieldRequiredMark; hidden: !fieldRequired"></span></span>`;
export let CONTROL_MESSAGES = html`
  <p ref="hint" class="text-sm text-agui-muted" bind="textContent: fieldHint; hidden: !fieldHint"></p>
  <p ref="error" class="text-sm text-agui-danger" role="status" bind="textContent: fieldError; hidden: !fieldError"></p>
`;

export let SELECT_CHEVRON = html`
  <svg class="agui-select-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
`;
