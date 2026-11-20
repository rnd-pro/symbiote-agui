import { html } from '@symbiotejs/symbiote/core/html.js';

export let TABS_TEMPLATE = html`
  <div ref="list" class="agui-tabs-list" role="tablist"
    bind="@aria-label: listLabel; @aria-orientation: listOrientation"
    itemize="buttons" item-tag="agui-tab-button"></div>
  <div ref="panels" class="agui-tabs-panels"><slot></slot></div>
`;

export let TAB_BUTTON_TEMPLATE = html`
  <button ref="button" type="button" role="tab" class="agui-tab-trigger"
    bind="id: id; value: value; textContent: label; disabled: disabled; tabIndex: tabIndex; @aria-selected: selected; @aria-controls: panelId; onclick: select">
  </button>
`;
