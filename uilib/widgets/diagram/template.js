import { html } from '@symbiotejs/symbiote/core/html.js';

export let DIAGRAM_TEMPLATE = html`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <figure>
    <figcaption bind="textContent: diagramLabel; hidden: !diagramLabel"></figcaption>
    <p class="text-sm text-agui-muted" bind="textContent: diagramDescription; hidden: !diagramDescription"></p>
    <div ref="plot" class="agui-diagram-plot" role="img"
      bind="@aria-label: diagramLabel; @aria-busy: busyText; hidden: plotHidden"></div>
  </figure>
  <details bind="hidden: !hasSource">
    <summary bind="textContent: sourceLabel"></summary>
    <pre class="overflow-auto text-sm"><code bind="textContent: sourceText"></code></pre>
  </details>
`;
