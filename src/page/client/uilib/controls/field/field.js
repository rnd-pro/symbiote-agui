import { Control } from '../../shared/control.js';
import { bindControlAttributes, watchAttribute } from '../../shared/control-attributes.js';
import { FIELD_ATTRIBUTES, FIELD_INPUT_TYPES } from '../../shared/constants.js';
import { FIELD_TEMPLATE, TEXTAREA_TEMPLATE } from './template.js';

export class Field extends Control {
  /**
   * @param {string | DocumentFragment} [template]
   * @param {boolean} [shadow]
   */
  render(template, shadow) {
    super.render(template ?? (this.getAttribute('type') === 'textarea' ? TEXTAREA_TEMPLATE : FIELD_TEMPLATE), shadow);
  }

  renderCallback() {
    let control = this.ref.control;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
      throw new Error('agui-field requires its template control.');
    }
    bindControlAttributes(this, control, FIELD_ATTRIBUTES);
    watchAttribute(this, 'value', (value) => { control.defaultValue = value ?? ''; });
    watchAttribute(this, 'type', (value) => {
      let type = value || 'text';
      if (control instanceof HTMLTextAreaElement) {
        if (type !== 'textarea') { throw new Error('Recreate the field to change between textarea and input.'); }
        return;
      }
      if (!FIELD_INPUT_TYPES.includes(type)) { throw new Error(`Unsupported agui-field input type: ${type}.`); }
      control.type = type;
    });
    if (control instanceof HTMLInputElement) {
      watchAttribute(this, 'checked', (value) => { control.defaultChecked = value !== null; });
    }
    super.renderCallback();
  }
}

