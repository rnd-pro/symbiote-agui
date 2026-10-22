import { Control } from '../../shared/control.js';
import { bindControlAttributes } from '../../shared/control-attributes.js';
import { CONTROL_ATTRIBUTE_BINDINGS, FIELD_ATTRIBUTES, FIELD_INPUT_TYPES } from '../../shared/constants.js';
import { FIELD_TEMPLATE, TEXTAREA_TEMPLATE } from './template.js';

export class Field extends Control {
  static observedAttributes = ['type', 'checked'];

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
    this.sub('attribute-value', () => { control.defaultValue = this.getAttribute('value') ?? ''; });
    this.defineAccessor('type', (/** @type {string | null | undefined} */ value) => {
      let type = value || 'text';
      if (control instanceof HTMLTextAreaElement) {
        if (type !== 'textarea') { throw new Error('Recreate the field to change between textarea and input.'); }
        return;
      }
      if (!FIELD_INPUT_TYPES.includes(type)) { throw new Error(`Unsupported agui-field input type: ${type}.`); }
      control.type = type;
    });
    if (control instanceof HTMLInputElement) {
      this.defineAccessor('checked', (/** @type {string | null | undefined} */ value) => { control.defaultChecked = value != null; });
    }
    super.renderCallback();
  }
}

Field.bindAttributes({
  ...CONTROL_ATTRIBUTE_BINDINGS,
  ...Object.fromEntries(FIELD_ATTRIBUTES.map((name) => [name, `attribute-${name}`])),
});

