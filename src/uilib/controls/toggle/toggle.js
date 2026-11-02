import { Control } from '../../shared/control.js';
import { CONTROL_ATTRIBUTE_BINDINGS } from '../../shared/constants.js';
import { TOGGLE_TEMPLATE } from './template.js';

export class Toggle extends Control {
  static observedAttributes = ['checked'];

  renderCallback() {
    let control = this.ref.control;
    this.defineAccessor('checked', (/** @type {string | null | undefined} */ value) => { control.defaultChecked = value != null; });
    super.renderCallback();
  }
}

Toggle.bindAttributes(CONTROL_ATTRIBUTE_BINDINGS);
Toggle.template = TOGGLE_TEMPLATE;
