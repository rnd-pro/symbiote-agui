import { html } from '@symbiotejs/symbiote/core/html.js';

export let LIST_TEMPLATE = html`
  <slot></slot>
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <div role="list" bind="className: listClass; @aria-label: listLabel; @aria-busy: busyText; hidden: surfaceHidden"
    itemize="items" item-tag="agui-list-item"></div>
`;

export let LIST_ITEM_TEMPLATE = html`
  <div ref="item" role="listitem" class="agui-list-item"
    bind="@data-item-id: id; @data-selected: selected; @data-selectable: selectable; tabIndex: tabIndex">
    <agui-field pub-to="^selectionInput" bind="@type: selectionType; @name: groupName; @value: id; $.value: fieldValue; $.disabled: unavailable; @aria-label: selectLabel; hidden: !selectionEnabled"></agui-field>
    <agui-component bind="@use-template: templateSelector; $: record"></agui-component>
  </div>
`;
