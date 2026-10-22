import { Symbiote } from '@symbiotejs/symbiote';
import { emit } from '../../events.js';
import { MAX_ACTION_VALUE_CHARS } from './constants.js';

/** @extends {Symbiote<import('../../../../../types/components.js').ComponentState>} */
export class UiComponent extends Symbiote {
  initCallback() {
    this.defineAccessor('state', (/** @type {import('../../../../../types/components.js').ComponentState | undefined} */ value) => {
      if (value !== undefined) { this.add$(value, true); }
    });
  }

  /**
   * @param {import('../../../../../types/uilib.js').UiAction['action']} action
   * @param {import('../../../../../types/uilib.js').UiValue} [value]
   */
  announce(action, value) {
    let context = this.getAttribute('ctx')?.trim() || null;
    /** @type {import('../../../../../types/uilib.js').UiAction} */
    let data = { widgetId: this.id || context || this.localName, context, action };
    if (typeof value === 'string' && value.length > MAX_ACTION_VALUE_CHARS) { data.valueLength = value.length; }
    else if (value !== undefined) { data.value = value; }
    return emit('agui:action', data);
  }
}
