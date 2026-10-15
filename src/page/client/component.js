import { Symbiote } from '@symbiotejs/symbiote';
import { readInitialData } from '../../markup/data.js';

/** @extends {Symbiote<import('../../../types/components.js').ComponentState>} */
export class AguiComponent extends Symbiote {
  /** @type {import('../../../types/components.js').ComponentState} */
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
