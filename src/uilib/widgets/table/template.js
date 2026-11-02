import { html } from '@symbiotejs/symbiote/core/html.js';

export let TABLE_TEMPLATE = html`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <div class="agui-table-scroll" role="region" tabindex="0" bind="@aria-label: tableLabel; hidden: surfaceHidden; @aria-busy: busyText">
    <table>
      <caption bind="textContent: tableLabel"></caption>
      <thead><tr itemize="headings" item-tag="agui-table-heading"></tr></thead>
      <tbody itemize="bodyRows" item-tag="agui-table-row"></tbody>
    </table>
  </div>
  <div class="agui-table-footer" bind="hidden: surfaceHidden">
    <p aria-live="polite">
      <span bind="textContent: resultsLabel"></span> <output bind="textContent: filteredCount"></output> / <output bind="textContent: totalCount"></output>
      <span bind="hidden: !selectionEnabled"> · <span bind="textContent: selectedLabel"></span> <output bind="textContent: selectedCount"></output></span>
    </p>
    <div class="agui-table-pagination" role="group" bind="@aria-label: paginationLabel; hidden: paginationHidden">
      <button type="button" bind="onclick: previous_page; disabled: previousDisabled; @aria-label: previousLabel"><agui-icon name="chevron_left"></agui-icon></button>
      <span class="agui-table-page"><span bind="textContent: pageLabel"></span> <output bind="textContent: effectivePage"></output> / <output bind="textContent: pageCount"></output></span>
      <button type="button" bind="onclick: next_page; disabled: nextDisabled; @aria-label: nextLabel"><agui-icon name="chevron_right"></agui-icon></button>
    </div>
  </div>
`;

export let TABLE_HEADING_TEMPLATE = html`
  <th scope="col" bind="id: headingId; @aria-sort: ariaSort; @data-column: columnKey">
    <div class="agui-table-heading-content">
      <agui-field type="checkbox" pub-to="^selectionValue"
        bind="hidden: !selectAll; $.disabled: unavailable; $.value: selected; $.indeterminate: mixed; @aria-label: selectAllLabel"></agui-field>
      <span bind="textContent: label; hidden: sortable"></span>
      <button class="agui-table-sort" type="button" bind="onclick: sort_column; hidden: !sortable; disabled: unavailable">
        <span bind="textContent: label"></span><agui-icon bind="$.name: sortIcon" aria-hidden="true"></agui-icon>
      </button>
    </div>
  </th>
`;

export let TABLE_ROW_TEMPLATE = html`
  <tr ref="row" bind="@data-row-id: rowId; @data-selectable: selectable; @aria-selected: selectedText; tabIndex: tabIndex" itemize="cells" item-tag="agui-table-cell"></tr>
`;

export let TABLE_CELL_TEMPLATE = html`
  <td bind="@headers: headingId; @data-column: columnKey">
    <span bind="hidden: isSelection">
      <span bind="textContent: text; className: cellClass; @data-tone: tone"></span>
    </span>
    <agui-field pub-to="^selectionValue"
      bind="@type: selectionType; @name: groupName; @value: rowId; $.value: selectionValue; hidden: !isSelection; $.disabled: unavailable; @aria-label: selectLabel"></agui-field>
  </td>
`;
