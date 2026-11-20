import { html } from '@symbiotejs/symbiote/core/html.js';
import { CONTROL_LABEL, CONTROL_MESSAGES } from '../../shared/control-template.js';

export let TOGGLE_TEMPLATE = html`<label>${CONTROL_LABEL}<input ref="control" type="checkbox" switch role="switch"></label>${CONTROL_MESSAGES}`;
