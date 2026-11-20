import { html } from '@symbiotejs/symbiote/core/html.js';

export let STEPS_TEMPLATE = html`
  <agui-state bind="$.status: statusState; $.message: statusMessage; hidden: !statusMessage"></agui-state>
  <ol role="list" bind="@aria-label: progressLabel; @aria-labelledby: progressLabelledBy" itemize="entries">
    <template>
      <li bind="@data-state: state; @aria-current: current">
        <span class="agui-step-marker" aria-hidden="true">
          <agui-icon name="check" bind="hidden: !completed"></agui-icon>
          <span bind="textContent: number; hidden: completed"></span>
        </span>
        <span class="agui-step-label" bind="textContent: label"></span>
        <span class="sr-only" bind="textContent: statusLabel"></span>
      </li>
    </template>
  </ol>
`;
