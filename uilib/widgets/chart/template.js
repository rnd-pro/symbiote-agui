import { html } from '@symbiotejs/symbiote/core/html.js';

export let CHART_TEMPLATE = html`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <figure>
    <figcaption bind="textContent: chartLabel"></figcaption>
    <p class="agui-chart-description" bind="textContent: chartDescription; hidden: !chartDescription"></p>
    <div ref="plot" class="agui-chart-plot" role="img" bind="@aria-label: chartLabel; hidden: plotHidden"></div>
  </figure>
  <details bind="hidden: !modelValid">
    <summary bind="textContent: dataLabel"></summary>
    <agui-chart-data ref="data" page-size="20"
      bind="id: dataTableId; $.label: chartLabel; $.rows: dataRows; $.columns: dataColumns; $.texts: texts; $.value: effectiveSelected; $.selection: dataSelectionMode; $.disabled: dataDisabled; $.loading: dataLoading; $.error: dataError"></agui-chart-data>
  </details>
`;
