import {
  html,
} from '@symbiotejs/symbiote/core/html.js';

export let DATA_TOOLBAR_TEMPLATE = html`
  <div ref="bar" class="agui-data-bar">
    <agui-toolbar bind="@aria-label: actionsLabel">
      <button class="agui-button-primary" type="button" bind="onclick: ^save; disabled: ^saveDisabled; @title: ^saveHint">
        <agui-icon name="save" aria-hidden="true"></agui-icon>
        <span bind="textContent: ^saveLabel"></span>
      </button>
      <button type="button" bind="onclick: ^cancel; disabled: ^cancelDisabled">
        <agui-icon name="cancel" aria-hidden="true"></agui-icon>
        <span bind="textContent: ^cancelLabel"></span>
      </button>
      <button type="button" bind="onclick: ^importJson; disabled: ^importDisabled">
        <agui-icon name="upload" aria-hidden="true"></agui-icon>
        <span bind="textContent: ^importLabel"></span>
      </button>
      <button type="button" bind="onclick: ^exportJson; disabled: ^exportDisabled">
        <agui-icon name="download" aria-hidden="true"></agui-icon>
        <span bind="textContent: ^exportLabel"></span>
      </button>
      <button type="button" bind="onclick: ^checkSave; hidden: !^uncertain; disabled: ^checkDisabled">
        <agui-icon name="refresh" aria-hidden="true"></agui-icon>
        <span bind="textContent: ^checkSaveLabel"></span>
      </button>
      <span class="agui-data-marker" bind="textContent: ^roleLabel"></span>
      <span class="agui-data-marker" bind="textContent: ^connectionLabel; @data-connected: ^socketConnected"></span>
    </agui-toolbar>
  </div>
  <div ref="messages" class="agui-data-messages" popover="manual" hidden bind="hidden: !messagesVisible">
    <div class="agui-data-status" role="status" aria-live="polite" aria-atomic="true">
      <span bind="textContent: editMessage"></span>
      <span bind="textContent: localMessage"></span>
      <span bind="textContent: deliveryMessage"></span>
      <span bind="textContent: externalMessage"></span>
      <span bind="textContent: transferMessage"></span>
    </div>
    <p class="agui-data-error" role="alert" bind="textContent: errorMessage; hidden: !errorMessage"></p>
    <button class="agui-data-dismiss" type="button" bind="onclick: closeMessages; @aria-label: closeLabel">
      <agui-icon name="close" aria-hidden="true"></agui-icon>
    </button>
  </div>
  <input ref="file" type="file" hidden bind="@aria-label: fileLabel">
`;
