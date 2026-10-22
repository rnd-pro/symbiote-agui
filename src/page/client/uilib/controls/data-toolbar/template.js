import { html } from '@symbiotejs/symbiote/core/html.js';

export let DATA_TOOLBAR_TEMPLATE = html`
  <div ref="bar" class="agui-data-bar">
    <agui-toolbar bind="@aria-label: actionsLabel">
      <button type="button" bind="textContent: ^saveLabel; onclick: ^save; disabled: ^saveDisabled; @title: ^saveHint"></button>
      <button type="button" bind="textContent: ^cancelLabel; onclick: ^cancel; disabled: ^cancelDisabled"></button>
      <button type="button" bind="textContent: ^importLabel; onclick: ^importJson; disabled: ^importDisabled"></button>
      <button type="button" bind="textContent: ^exportLabel; onclick: ^exportJson; disabled: ^exportDisabled"></button>
      <button type="button" bind="textContent: ^checkSaveLabel; onclick: ^checkSave; hidden: !^uncertain; disabled: ^checkDisabled"></button>
      <span class="agui-data-marker" bind="textContent: ^roleLabel"></span>
      <span class="agui-data-marker" bind="textContent: ^connectionLabel; @data-connected: ^socketConnected"></span>
    </agui-toolbar>
    <div class="agui-data-status" role="status" aria-live="polite" aria-atomic="true">
      <span bind="textContent: editMessage"></span>
      <span bind="textContent: localMessage"></span>
      <span bind="textContent: deliveryMessage"></span>
      <span bind="textContent: externalMessage"></span>
      <span bind="textContent: transferMessage"></span>
    </div>
    <p class="text-agui-danger text-sm" role="alert" bind="textContent: errorMessage; hidden: !errorMessage"></p>
  </div>
  <input ref="file" type="file" hidden bind="@aria-label: fileLabel">
`;
