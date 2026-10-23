import {
  html,
} from '@symbiotejs/symbiote/core/html.js';

export let STATE_TEMPLATE = html`
  <div ref="message" class="agui-state-message grid gap-3 border p-4 text-sm" bind="hidden: stateHidden; @role: stateRole; @aria-busy: stateBusy">
    <p bind="textContent: stateMessage"></p>
    <button class="agui-button justify-self-start" type="button" bind="textContent: stateRetryLabel; hidden: !retryVisible; onclick: retry"></button>
  </div>
`;
