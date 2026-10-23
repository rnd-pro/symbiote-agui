import { UiComponent } from '../../page/client/uilib/shared/component.js';
import { SESSION_STATE } from './session-state.js';
import { SESSION_CONTROLS_TEMPLATE } from './controls-template.js';

export class SessionControls extends UiComponent {
  init$ = {
    ...SESSION_STATE,
  };
}

SessionControls.template = SESSION_CONTROLS_TEMPLATE;
SessionControls.reg('agui-session-controls');
