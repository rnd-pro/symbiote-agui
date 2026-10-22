export let DATA_TOOLBAR_TEMPLATE = `
  <div ref="bar" class="agui-data-bar">
    <agui-toolbar label="Data actions">
      <button type="button" bind="onclick: ^save; disabled: ^saveDisabled; @title: ^saveHint">Save</button>
      <button type="button" bind="onclick: ^cancel; disabled: ^cancelDisabled">Cancel changes</button>
      <button type="button" bind="onclick: ^importJson; disabled: ^importDisabled">Import JSON</button>
      <button type="button" bind="onclick: ^exportJson; disabled: ^exportDisabled">Export JSON</button>
      <button type="button" bind="onclick: ^checkSave; hidden: !^uncertain; disabled: ^checkDisabled">Check save status</button>
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
  <input ref="file" type="file" hidden aria-label="Import JSON data">
`;
