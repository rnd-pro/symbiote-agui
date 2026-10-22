import { Control } from '../../shared/control.js';
import { watchAttribute } from '../../shared/control-attributes.js';
import { TOGGLE_TEMPLATE } from './template.js';

export class Toggle extends Control {
  renderCallback() {
    let control = this.ref.control;
    watchAttribute(this, 'checked', (value) => { control.defaultChecked = value !== null; });
    super.renderCallback();
  }
}

Toggle.template = TOGGLE_TEMPLATE;
