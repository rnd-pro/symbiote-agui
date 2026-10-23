import { html } from '@symbiotejs/symbiote/core/html.js';

export let DATA_TOOLBAR_TEMPLATE = html`
  <div ref="bar" class="agui-data-bar agui-popover">
    <agui-toolbar class="items-center" bind="@aria-label: actionsLabel">
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
      <div class="agui-data-markers" role="status" aria-live="polite" aria-atomic="true">
        <span class="agui-chip" bind="textContent: ^roleLabel"></span>
        <span class="agui-chip" bind="textContent: ^connectionLabel; @data-tone: ^connectionTone"></span>
      </div>
    </agui-toolbar>
  </div>
  <agui-message ref="messages" hidden></agui-message>
  <input ref="file" type="file" hidden bind="@aria-label: fileLabel">
`;
