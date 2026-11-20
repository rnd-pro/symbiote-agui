import { BaseClass } from '@symbiotejs/symbiote/html-app';
import { emitAction } from './events.js';
import { MAX_ACTION_VALUE_CHARS } from './constants.js';

export class UiComponent extends BaseClass {
  processInnerHtml = false;
  allowCustomTemplate = false;

  get actionId() {
    return this.id || this.getAttribute('ctx')?.trim() || this.localName;
  }

  /**
   * @param {import('../types/uilib.js').UiAction['action']} action
   * @param {import('../types/uilib.js').UiValue} [value]
   */
  announce(action, value) {
    let context = this.getAttribute('ctx')?.trim() || null;
    /** @type {import('../types/uilib.js').UiAction} */
    let data = { widgetId: this.actionId, context, action };
    if (typeof value === 'string' && value.length > MAX_ACTION_VALUE_CHARS) { data.valueLength = value.length; }
    else if (value !== undefined) { data.value = value; }
    return emitAction(this, data);
  }
}
