import { html } from '@symbiotejs/symbiote/core/html.js';

export let BUTTON_TEMPLATE = html`
  <button ref="control" type="button" bind="ariaBusy: buttonBusy">
    <agui-preloader class="size-[1em]" aria-hidden="true" bind="hidden: !buttonLoading"></agui-preloader>
    <slot></slot>
  </button>
`;
