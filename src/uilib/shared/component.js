import { Symbiote } from '@symbiotejs/symbiote';
import { emit } from './events.js';
import { MAX_ACTION_VALUE_CHARS } from './constants.js';
import { PubMap } from './pub-map.js';

/** @extends {Symbiote<import('../../../types/components.js').ComponentState>} */
export class UiComponent extends Symbiote {
  static observedAttributes = [
    'pub-map',
  ];
  outgoingBindings = new PubMap(this);

  /** @param {string | null} _value */
  set 'pub-map'(_value) {
    this.outgoingBindings.refresh();
  }

  connectedCallback() {
    if (!this.connectedOnce) {
      let parsing = this.getAttribute('process-inner-html');
      if (parsing !== null) { this.processInnerHtml = parsing !== 'false'; }
    }
    super.connectedCallback();
    if (this.connectedOnce) { this.outgoingBindings.connect(); }
  }

  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    super.render(template, shadow);
    this.outgoingBindings.connect();
  }

  disconnectedCallback() {
    this.outgoingBindings.disconnect();
    super.disconnectedCallback();
  }

  get actionId() {
    return this.id || this.getAttribute('ctx')?.trim() || this.localName;
  }

  /**
   * @param {import('../../../types/uilib.js').UiAction['action']} action
   * @param {import('../../../types/uilib.js').UiValue} [value]
   */
  announce(action, value) {
    let context = this.getAttribute('ctx')?.trim() || null;
    /** @type {import('../../../types/uilib.js').UiAction} */
    let data = { widgetId: this.actionId, context, action };
    if (typeof value === 'string' && value.length > MAX_ACTION_VALUE_CHARS) { data.valueLength = value.length; }
    else if (value !== undefined) { data.value = value; }
    return emit('agui:action', data);
  }
}
