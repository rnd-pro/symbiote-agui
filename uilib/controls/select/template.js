import { html } from '@symbiotejs/symbiote/core/html.js';
import { CONTROL_LABEL, CONTROL_MESSAGES, SELECT_CHEVRON } from '../../shared/control-template.js';

export let SELECT_TEMPLATE = html`
  <label class="agui-control-label">
    ${CONTROL_LABEL}
    <span class="agui-select-control">
      <select ref="control"></select>
      ${SELECT_CHEVRON}
    </span>
  </label>
  ${CONTROL_MESSAGES}
`;
