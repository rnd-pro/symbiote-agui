import { html } from '@symbiotejs/symbiote/core/html.js';

export let DIALOG_TEMPLATE = html`
  <button ref="trigger" type="button" aria-haspopup="dialog"
    bind="onclick: open; textContent: triggerLabel; hidden: !triggerLabel; @aria-controls: surfaceId; @aria-expanded: openedText"></button>
  <dialog ref="dialog" class="agui-dialog-surface" bind="id: surfaceId; @aria-label: dialogLabel">
    <div class="agui-dialog-heading">
      <h2 bind="textContent: dialogLabel; hidden: !dialogLabel"></h2>
      <button type="button" class="agui-button-icon agui-button-ghost"
        bind="onclick: close; @aria-label: dismissLabel; hidden: !dismissLabel">
        <agui-icon name="close"></agui-icon>
      </button>
    </div>
    <div class="agui-dialog-content"><slot></slot></div>
  </dialog>
`;
