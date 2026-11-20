import { html } from '@symbiotejs/symbiote/core/html.js';

export let THEME_SELECTOR_TEMPLATE = html`
  <button ref="trigger" type="button" class="agui-button-icon"
    bind="@popovertarget: popupId; @aria-label: selectorLabel; @title: selectorLabel; disabled: unavailable">
    <agui-preloader aria-hidden="true" bind="hidden: !saving"></agui-preloader>
    <agui-icon name="palette" aria-hidden="true" bind="hidden: saving"></agui-icon>
  </button>
  <div ref="panel" popover="auto" class="agui-theme-panel agui-popover" role="group"
    bind="id: popupId; @aria-label: selectorLabel">
    <div class="grid gap-2" itemize="entries">
      <template>
        <button type="button" class="agui-theme-option" bind="value: value; onclick: select; @aria-pressed: pressed; disabled: disabled">
          <span class="agui-theme-preview" aria-hidden="true"><span></span><span></span><span></span></span>
          <span bind="textContent: label"></span>
          <agui-icon name="check" aria-hidden="true" bind="hidden: !selected"></agui-icon>
        </button>
      </template>
    </div>
    <p role="status" aria-live="polite"
      bind="className: statusClass; textContent: statusMessage; hidden: !statusMessage"></p>
  </div>
`;
