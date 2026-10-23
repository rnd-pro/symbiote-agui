import { html } from '@symbiotejs/symbiote/core/html.js';
import { SELECT_CHEVRON } from '../../shared/control-template.js';

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
    <span class="agui-select-control" bind="hidden: !isEquals">
      <select ref="equals" bind="@aria-label: label"></select>
      ${SELECT_CHEVRON}
    </span>
    <div class="agui-filter-range" bind="hidden: !isRange">
      <label><span bind="textContent: minLabel"></span><input ref="min" bind="type: rangeType"></label>
      <label><span bind="textContent: maxLabel"></span><input ref="max" bind="type: rangeType"></label>
    </div>
  </fieldset>
`;
