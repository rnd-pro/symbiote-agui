import { html } from '@symbiotejs/symbiote/core/html.js';

export let MAP_TEMPLATE = html`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <figure>
    <figcaption bind="textContent: mapLabel"></figcaption>
    <p class="agui-map-description" bind="textContent: mapDescription; hidden: !mapDescription"></p>
    <div ref="canvas" class="agui-map-canvas" role="region" bind="@aria-label: mapLabel; hidden: mapHidden"></div>
    <p class="agui-map-attribution" bind="hidden: !attribution">
      <a target="_blank" rel="noopener noreferrer" bind="textContent: attribution; href: attributionUrl; hidden: !attributionUrl"></a>
      <span bind="textContent: attribution; hidden: attributionUrl"></span>
    </p>
    <p class="agui-map-skipped" bind="hidden: !skippedCount"><span bind="textContent: skippedLabel"></span>: <span bind="textContent: skippedCount"></span></p>
  </figure>
  <agui-toolbar bind="@aria-label: mapLabel">
    <button type="button" bind="textContent: ^fitLabel; disabled: ^fitUnavailable; onclick: ^onFit"></button>
    <button type="button" bind="textContent: ^zoomInLabel; disabled: ^unavailable; onclick: ^onZoomIn"></button>
    <button type="button" bind="textContent: ^zoomOutLabel; disabled: ^unavailable; onclick: ^onZoomOut"></button>
  </agui-toolbar>
  <details bind="hidden: !modelValid">
    <summary bind="textContent: dataLabel"></summary>
    <agui-map-data ref="data" page-size="20"
      bind="id: dataTableId; $.label: mapLabel; $.rows: dataRows; $.columns: dataColumns; $.texts: texts; $.value: effectiveSelected; $.selection: dataSelectionMode; $.disabled: dataDisabled"></agui-map-data>
  </details>
`;
