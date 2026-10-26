import { html } from '@symbiotejs/symbiote/core/html.js';

export let KANBAN_TEMPLATE = html`
  <p class="agui-kanban-hint" bind="textContent: moveHint; hidden: !moveHint"></p>
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <div class="agui-kanban-scroll" role="region" tabindex="0" bind="@aria-label: boardLabel; @aria-busy: busyText; hidden: surfaceHidden">
    <ul class="agui-kanban-columns" itemize="columnItems" item-tag="agui-kanban-column"></ul>
  </div>
`;

export let KANBAN_COLUMN_TEMPLATE = html`
  <li class="agui-kanban-column" bind="@data-status: statusValue; @data-unassigned: unassigned">
    <h3 class="agui-kanban-column-heading">
      <output class="agui-chip" bind="textContent: count; @aria-label: countLabel; @data-tone: tone"></output>
      <span bind="textContent: label"></span>
    </h3>
    <p class="agui-kanban-empty" bind="textContent: emptyLabel; hidden: !empty"></p>
    <ul class="agui-kanban-cards" itemize="cards" item-tag="agui-kanban-card"></ul>
  </li>
`;

export let KANBAN_CARD_TEMPLATE = html`
  <li ref="card" class="agui-kanban-card" bind="@data-record-id: recordId; draggable: !unavailable; tabIndex: tabIndex; @aria-disabled: disabledText; @aria-description: moveHint">
    <h4 bind="textContent: title"></h4>
    <p class="agui-kanban-description" bind="textContent: description; hidden: !description"></p>
  </li>
`;
