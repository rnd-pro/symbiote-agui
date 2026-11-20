import { html } from '@symbiotejs/symbiote/core/html.js';

export let EXPLORER_TEMPLATE = html`
  <div role="listitem" class="grid min-w-0 gap-1" bind="style.paddingInlineStart: indent">
    <button type="button" class="agui-button-ghost w-full justify-start aria-pressed:text-agui-accent"
      bind="value: id; onclick: activateNode; @disabled: nodeDisabled; ariaExpanded: nodeExpanded; ariaPressed: nodeSelected; @aria-label: actionLabel; @title: label">
      <agui-icon bind="$.name: ^nodeIcon"></agui-icon>
      <span class="truncate" bind="textContent: label"></span>
      <agui-preloader class="size-4" aria-hidden="true" bind="hidden: !loading"></agui-preloader>
    </button>
    <p class="break-words text-xs text-agui-muted empty:hidden" bind="textContent: message; hidden: !showMessage"></p>
    <button type="button" class="agui-button-ghost w-fit" bind="onclick: loadMore; textContent: moreLabel; hidden: !showMore; @disabled: nodeDisabled"></button>
  </div>
`;
