import { html } from '@symbiotejs/symbiote/core/html.js';

export let DATA_TOOLBAR_TEMPLATE = html`
  <button ref="trigger" class="agui-data-trigger agui-button-icon" type="button"
    bind="@popovertarget: popupId; @aria-label: indicatorLabel; @title: indicatorLabel; @data-state: indicatorState; @data-tone: indicatorTone; @data-busy: indicatorBusy">
    <agui-icon bind="$.name: indicatorIcon" aria-hidden="true"></agui-icon>
  </button>
  <span class="sr-only" role="status" aria-live="polite" aria-atomic="true" bind="textContent: indicatorMessage"></span>
  <div ref="panel" popover="auto" class="agui-data-panel agui-popover" role="group" bind="id: popupId; @aria-label: actionsLabel">
    <div class="agui-data-heading">
      <h2 bind="textContent: actionsLabel"></h2>
      <button class="agui-button-icon" type="button" popovertargetaction="hide" bind="@popovertarget: popupId; @aria-label: closeActionsLabel">
        <agui-icon name="close" aria-hidden="true"></agui-icon>
      </button>
    </div>
    <agui-toolbar class="agui-data-actions grid grid-cols-2" bind="@aria-label: actionsLabel">
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
    </agui-toolbar>
    <div class="agui-data-markers">
      <span class="agui-chip" bind="textContent: roleLabel"></span>
      <span class="agui-chip" bind="textContent: connectionLabel; @data-tone: connectionTone"></span>
    </div>
    <div class="agui-data-status" role="status" aria-live="polite" aria-atomic="true">
      <p bind="textContent: editMessage; hidden: !editMessage"></p>
      <p bind="textContent: localMessage; hidden: !localMessage"></p>
      <p bind="textContent: deliveryMessage; hidden: !deliveryMessage"></p>
      <p bind="textContent: externalMessage; hidden: !externalMessage"></p>
      <p bind="textContent: transferMessage; hidden: !transferMessage"></p>
      <p class="agui-data-error" bind="textContent: errorMessage; hidden: !errorMessage"></p>
    </div>
  </div>
  <agui-message ref="messages" hidden></agui-message>
  <input ref="file" type="file" hidden bind="@aria-label: fileLabel">
`;
