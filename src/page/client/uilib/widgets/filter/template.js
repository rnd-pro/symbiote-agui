import { html } from '@symbiotejs/symbiote/core/html.js';

export let FILTER_TEMPLATE = html`
  <label class="agui-filter-query">
    <span bind="textContent: queryLabel"></span>
    <input ref="query" type="search" maxlength="2048" bind="value: queryText; disabled: unavailable; @aria-label: queryLabel">
  </label>
  <div class="agui-filter-fields" itemize="fieldItems" item-tag="agui-filter-field"></div>
  <p role="status" aria-live="polite" bind="textContent: statusMessage; hidden: !statusMessage"></p>
`;

export let FILTER_FIELD_TEMPLATE = html`
  <fieldset bind="disabled: unavailable; @data-field: fieldKey">
    <legend bind="textContent: label"></legend>
    <input ref="contains" type="search" maxlength="2048" bind="hidden: !isContains; @aria-label: label">
    <select ref="equals" bind="hidden: !isEquals; @aria-label: label"></select>
    <div class="agui-filter-range" bind="hidden: !isRange">
      <label><span bind="textContent: minLabel"></span><input ref="min" bind="type: rangeType"></label>
      <label><span bind="textContent: maxLabel"></span><input ref="max" bind="type: rangeType"></label>
    </div>
  </fieldset>
`;
