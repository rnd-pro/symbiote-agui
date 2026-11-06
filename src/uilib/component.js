import { UiComponent } from './shared/component.js';
import { readInitialData } from './shared/initial-data.js';

export class AguiComponent extends UiComponent {
  /** @type {import('../../types/components.js').ComponentState} */
  init$ = {};
  processInnerHtml = true;
  allowCustomTemplate = true;
  destructionDelay = 0;

  connectedCallback() {
    if (!this.connectedOnce) {
      this.init$ = { ...this.init$, ...readInitialData(this) };
    }
    super.connectedCallback();
  }
}
