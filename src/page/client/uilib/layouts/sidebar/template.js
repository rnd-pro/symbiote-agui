import { html } from '@symbiotejs/symbiote/core/html.js';

export let SIDEBAR_TEMPLATE = html`
  <div class="agui-sidebar-heading">
    <button ref="toggle" type="button" class="agui-button-icon agui-button-ghost"
      bind="onclick: toggle; disabled: unavailable; @aria-expanded: expandedText; @aria-controls: contentId; @aria-label: toggleLabel">
      <agui-icon name="menu"></agui-icon>
    </button>
    <span bind="textContent: sidebarLabel; hidden: !expanded"></span>
  </div>
  <div ref="content" class="agui-sidebar-content" bind="hidden: !expanded; id: contentId">
    <slot></slot>
  </div>
`;
