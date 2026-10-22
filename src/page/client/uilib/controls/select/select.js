import { Control } from '../../shared/control.js';
import { CONTROL_ATTRIBUTE_BINDINGS } from '../../shared/constants.js';
import { SELECT_TEMPLATE } from './template.js';

export class Select extends Control {
  constructor() {
    super();
    Object.assign(this.init$, { options: [], placeholder: undefined });
  }

  renderCallback() {
    super.renderCallback();
    this.watchControlState('placeholder', () => this.getAttribute('placeholder') || '', () => this.renderOptions());
    this.sub('options', (value) => {
      if (!Array.isArray(value) || value.some((option) => !option || typeof option.value !== 'string' || typeof option.label !== 'string')) {
        throw new Error('agui-select options require string value and label properties.');
      }
      this.renderOptions();
    });
  }

  renderOptions() {
    let control = this.control;
    if (!(control instanceof HTMLSelectElement)) { return; }
    let placeholder = String(this.$.placeholder ?? this.getAttribute('placeholder') ?? '');
    let options = /** @type {import('../../../../../../types/uilib.js').UiOption[]} */ (this.$.options);
    let fragment = document.createDocumentFragment();
    if (placeholder) { fragment.append(new Option(placeholder, '')); }
    for (let item of options) {
      let option = new Option(item.label, item.value);
      option.disabled = !!item.disabled;
      fragment.append(option);
    }
    control.replaceChildren(fragment);
    this.showValue(this.$.value);
  }

  /** @param {unknown} value */
  commit(value) {
    let options = /** @type {import('../../../../../../types/uilib.js').UiOption[]} */ (this.$.options);
    if (value !== '' && !options.some((option) => option.value === value && !option.disabled)) {
      throw new Error('Choose an enabled option value.');
    }
    return super.commit(value);
  }
}

Select.bindAttributes({
  ...CONTROL_ATTRIBUTE_BINDINGS,
  placeholder: 'attribute-placeholder',
});
Select.template = SELECT_TEMPLATE;
