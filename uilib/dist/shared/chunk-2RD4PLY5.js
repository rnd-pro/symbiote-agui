import{b as e}from"./chunk-R5MGQJ77.js";var n=e`<span ref="label" class="inline-flex gap-1 text-sm text-agui-text" bind="hidden: !fieldLabel"><span bind="textContent: fieldLabel"></span><span aria-hidden="true" bind="textContent: fieldRequiredMark; hidden: !fieldRequired"></span></span>`,t=e`
  <p ref="hint" class="text-sm text-agui-muted" bind="textContent: fieldHint; hidden: !fieldHint"></p>
  <p ref="error" class="text-sm text-agui-danger" role="status" bind="textContent: fieldError; hidden: !fieldError"></p>
`,i=e`
  <svg class="agui-select-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
`;var d=e`
  <button ref="control" type="button"
    bind="className: buttonClass; @aria-label: buttonLabel; @title: fieldLabel; @aria-busy: saveBusy">
    <agui-preloader aria-hidden="true" bind="hidden: !saving"></agui-preloader>
    <agui-icon bind="$.name: themeIcon; hidden: saving"></agui-icon>
    <span ref="label" bind="textContent: fieldLabel; hidden: !showText"></span>
  </button>
  ${t}
  <agui-message bind="$.message: saveMessage; $.tone: saveTone; $.closeLabel: saveCloseLabel"></agui-message>
`;export{n as a,t as b,i as c,d};
