import { html } from '@symbiotejs/symbiote/core/html.js';
import { CONTROL_LABEL, CONTROL_MESSAGES } from '../../shared/control-template.js';

export let SELECT_TEMPLATE = html`
  <label class="agui-control-label">
    ${CONTROL_LABEL}
    <span class="agui-select-control">
      <select ref="control"></select>
      <svg class="agui-select-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </span>
  </label>
  ${CONTROL_MESSAGES}
`;
