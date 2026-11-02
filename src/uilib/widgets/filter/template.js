import { html } from '@symbiotejs/symbiote/core/html.js';

export let FILTER_TEMPLATE = html`
  <agui-field class="agui-filter-query" type="search" maxlength="2048" pub-to="^queryText"
    bind="$.label: queryLabel; $.value: queryText; $.disabled: unavailable"></agui-field>
  <div class="agui-filter-fields" itemize="fieldItems" item-tag="agui-filter-field"></div>
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
`;

export let FILTER_FIELD_TEMPLATE = html`
  <fieldset bind="disabled: unavailable; @data-field: fieldKey">
    <legend bind="textContent: label; hidden: !isRange"></legend>
    <agui-field type="search" maxlength="2048" pub-to="^containsValue"
      bind="hidden: !isContains; $.label: label; $.value: containsValue; $.disabled: unavailable"></agui-field>
    <agui-select pub-to="^equalsValue"
      bind="hidden: !isEquals; $.label: label; $.value: equalsValue; $.options: selectOptions; $.disabled: unavailable"></agui-select>
    <div class="agui-filter-range" bind="hidden: !isRange">
      <agui-field ref="min" pub-to="^minValue"
        bind="@type: rangeType; $.label: minLabel; $.value: minValue; $.disabled: unavailable; @max: maxValue; @step: rangeStep"></agui-field>
      <agui-field ref="max" pub-to="^maxValue"
        bind="@type: rangeType; $.label: maxLabel; $.value: maxValue; $.disabled: unavailable; @min: minValue; @step: rangeStep"></agui-field>
    </div>
  </fieldset>
`;
