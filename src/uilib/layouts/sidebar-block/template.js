import { html } from '@symbiotejs/symbiote/core/html.js';

export let SIDEBAR_BLOCK_TEMPLATE = html`
  <fieldset bind="disabled: inactive">
    <legend ref="heading" tabindex="-1" bind="textContent: blockLabel"></legend>
    <div ref="content" bind="hidden: inactive; inert: inactive">
      <slot></slot>
    </div>
  </fieldset>
`;
