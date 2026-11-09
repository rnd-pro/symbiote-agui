import { html } from '@symbiotejs/symbiote/core/html.js';
import { CONTROL_MESSAGES } from '../../shared/control-template.js';

export let THEME_TOGGLE_TEMPLATE = html`
  <button ref="control" type="button"
    bind="className: buttonClass; @aria-label: buttonLabel; @title: fieldLabel; @aria-busy: saveBusy">
    <agui-preloader aria-hidden="true" bind="hidden: !saving"></agui-preloader>
    <agui-icon bind="$.name: themeIcon; hidden: saving"></agui-icon>
    <span ref="label" bind="textContent: fieldLabel; hidden: !showText"></span>
  </button>
  ${CONTROL_MESSAGES}
  <agui-message bind="$.message: saveMessage; $.tone: saveTone; $.closeLabel: saveCloseLabel"></agui-message>
`;
