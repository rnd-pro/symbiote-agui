import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from './component.js';
import { CONTROL_ATTRIBUTES, CONTROL_ATTRIBUTE_BINDINGS } from './constants.js';
import { bindControlAttributes } from './control-attributes.js';

let nextFieldId = 0;

export class Control extends UiComponent {
  /** @type {import('../../../../../types/uilib.js').UiControl | undefined} */
  control;
  descriptionIds = '';
  init$ = {
    value: undefined, label: undefined, hint: undefined, error: undefined, requiredMark: undefined, fieldRequiredMark: '',
    disabled: undefined, readonly: undefined, required: undefined,
    fieldLabel: '', fieldHint: '', fieldError: '', fieldDisabled: false, fieldReadonly: false, fieldRequired: false,
    set_value: new ToolDescriptor({
      description: 'Set this control value. Returns only the resulting value and change flag.',
      inputSchema: { type: 'object', properties: { value: { anyOf: [{ type: 'string' }, { type: 'boolean' }] } }, required: ['value'], additionalProperties: false },
      execute: ({ value }) => this.commit(value),
    }),
    clear_value: new ToolDescriptor({
      description: 'Clear this control value through its context.',
      execute: () => this.commit(this.isCheckbox ? false : ''),
    }),
    read_value: new ToolDescriptor({
      description: 'Read this control value without returning unrelated application state.',
      execute: () => ({ value: this.$.value }),
    }),
  };

  get isCheckbox() {
    return this.control instanceof HTMLInputElement && this.control.type === 'checkbox';
  }

  renderCallback() {
    let control = this.ref.control;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) {
      throw new Error(`${this.localName} requires a native input, textarea, or select.`);
    }
    this.control = control;
    bindControlAttributes(this, control, CONTROL_ATTRIBUTES);
    control.id ||= `agui-field-${++nextFieldId}`;
    this.ref.label.parentElement.htmlFor = control.id;
    this.ref.hint.id = `${control.id}-hint`;
    this.ref.error.id = `${control.id}-error`;
    this.sub('attribute-aria-describedby', () => { this.descriptionIds = this.getAttribute('aria-describedby') || ''; this.describe(); });
    this.watchControlState('label', () => this.getAttribute('label') || '', (value) => { this.$.fieldLabel = String(value); });
    let refreshRequiredMark = () => { this.$.fieldRequiredMark = String(this.$.requiredMark ?? this.getAttribute('required-mark') ?? ''); };
    this.sub('requiredMark', refreshRequiredMark);
    this.sub('attribute-required-mark', refreshRequiredMark);
    this.watchControlState('hint', () => this.getAttribute('hint') || '', (value) => { this.$.fieldHint = String(value); this.describe(); });
    this.watchControlState('error', () => this.getAttribute('error') || '', (value) => { this.$.fieldError = String(value ?? ''); this.describe(); });
    this.watchControlState('disabled', () => this.hasAttribute('disabled'), (value) => { this.$.fieldDisabled = !!value; this.setAvailability(); });
    this.watchControlState('readonly', () => this.hasAttribute('readonly'), (value) => { this.$.fieldReadonly = !!value; this.setAvailability(); });
    this.watchControlState('required', () => this.hasAttribute('required'), (value) => { control.required = !!value; this.$.fieldRequired = !!value; });
    if (this.$.value === undefined) {
      this.$.value = this.isCheckbox && control instanceof HTMLInputElement ? control.checked : this.getAttribute('value') ?? control.value;
    }
    this.sub('value', (value) => this.showValue(value));
    control.addEventListener('input', this.onInput);
    control.addEventListener('change', this.onInput);
    control.addEventListener('blur', this.onValidity);
    control.addEventListener('invalid', this.onValidity);
  }

  /**
   * @param {string} key
   * @param {() => unknown} fallback
   * @param {(value: unknown) => void} handler
   */
  watchControlState(key, fallback, handler) {
    let refresh = () => handler(this.$[key] ?? fallback());
    this.sub(key, refresh);
    this.sub(`attribute-${key}`, refresh);
  }

  setAvailability() {
    if (!this.control) { return; }
    let readonly = !!this.$.fieldReadonly;
    this.control.disabled = !!this.$.fieldDisabled || (readonly && (this.control instanceof HTMLSelectElement || this.isCheckbox || this.control.type === 'radio'));
    if ('readOnly' in this.control) { this.control.readOnly = readonly; }
  }

  /** @param {unknown} value */
  showValue(value) {
    let control = this.control;
    if (!control) { return; }
    if (control instanceof HTMLInputElement && ['checkbox', 'radio'].includes(control.type)) {
      control.checked = this.isCheckbox ? value === true : String(value ?? '') === control.value;
    } else { control.value = String(value ?? ''); }
    this.describe();
  }

  describe() {
    let control = this.control;
    if (!control) { return; }
    let ids = [this.descriptionIds, this.$.fieldHint ? this.ref.hint.id : '', this.$.fieldError ? this.ref.error.id : ''].filter(Boolean).join(' ');
    if (ids) { control.setAttribute('aria-describedby', ids); }
    else { control.removeAttribute('aria-describedby'); }
    if (this.$.fieldError || control.matches(':user-invalid')) { control.setAttribute('aria-invalid', 'true'); }
    else { control.removeAttribute('aria-invalid'); }
  }

  /** @param {unknown} value */
  commit(value) {
    if (!this.control || this.control.matches(':disabled') || this.$.fieldDisabled || this.$.fieldReadonly) { throw new Error('This control is disabled or read-only.'); }
    if (typeof value !== (this.isCheckbox ? 'boolean' : 'string')) { throw new Error(this.isCheckbox ? 'Use a boolean value.' : 'Use a string value.'); }
    let changed = !Object.is(this.$.value, value);
    if (changed) {
      this.$.value = value;
      let target = this.getAttribute('pub-to')?.trim();
      if (target && !Object.is(this.$[target], value)) { this.$[target] = value; }
      this.announce('change', /** @type {import('../../../../../types/uilib.js').UiValue} */ (value));
    }
    return { value, changed };
  }

  onInput = () => {
    if (!this.control) { return; }
    if (this.control instanceof HTMLInputElement && this.control.type === 'radio' && !this.control.checked) { return; }
    this.commit(this.isCheckbox && this.control instanceof HTMLInputElement ? this.control.checked : this.control.value);
    this.describe();
  };
  onValidity = () => this.describe();

  destroyCallback() {
    this.control?.removeEventListener('input', this.onInput);
    this.control?.removeEventListener('change', this.onInput);
    this.control?.removeEventListener('blur', this.onValidity);
    this.control?.removeEventListener('invalid', this.onValidity);
  }
}

Control.bindAttributes(CONTROL_ATTRIBUTE_BINDINGS);
