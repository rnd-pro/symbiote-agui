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
      <button type="button" aria-haspopup="dialog" bind="onclick: ^showDescription; disabled: ^informationDisabled">
        <agui-icon name="info" aria-hidden="true"></agui-icon>
        <span bind="textContent: ^descriptionLabel"></span>
      </button>
      <button type="button" aria-haspopup="dialog" bind="onclick: ^showMetadata; disabled: ^informationDisabled">
        <agui-icon name="settings" aria-hidden="true"></agui-icon>
        <span bind="textContent: ^metadataLabel"></span>
      </button>
    </agui-toolbar>
    <div class="agui-data-markers">
      <span class="agui-chip" bind="textContent: roleLabel"></span>
      <span class="agui-chip" bind="textContent: connectionLabel; @data-tone: connectionTone"></span>
    </div>
    <div class="agui-data-status" role="status" aria-live="polite" aria-atomic="true" itemize="statusMessages">
      <template>
        <p class="agui-data-notice" bind="textContent: message; @data-tone: tone; @data-kind: _KEY_"></p>
      </template>
    </div>
  </div>
  <agui-dialog ref="information" pub-to="^informationOpen"
    bind="$.value: informationOpen; $.label: informationLabel; $.closeLabel: closeInformationLabel">
    <p role="status" aria-live="polite" bind="textContent: ^informationMessage; hidden: !^informationMessage"></p>
    <agui-markdown bind="hidden: ^descriptionHidden; $.value: ^description; $.label: ^descriptionLabel; $.texts: ^descriptionTexts; $.extensions: ^descriptionExtensions"></agui-markdown>
    <pre class="agui-data-metadata" bind="hidden: ^metadataHidden"><code bind="textContent: ^metadata"></code></pre>
  </agui-dialog>
  <div ref="messages" itemize="notifications" item-tag="agui-message"></div>
  <input ref="file" type="file" hidden bind="@aria-label: fileLabel">
`;
