import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { FILTER_VALUE_SCHEMA } from './schemas.js';
import { FILTER_FIELD_TEMPLATE } from './template.js';

export class FilterField extends UiComponent {
  componentDescription = () => JSON.stringify({
    filterId: this.closest('agui-filter')?.id || '',
    field: this.$.fieldKey,
    label: this.$.label,
  });
  init$ = {
    id: '',
    fieldKey: '',
    label: '',
    minLabel: '',
    maxLabel: '',
    allLabel: '',
    isContains: false,
    isEquals: false,
    isRange: false,
    rangeType: 'number',
    filterValue: '',
    options: [],
    unavailable: false,
    set_filter: new ToolDescriptor({
      description: 'Set this filter field to text, an option value, or inclusive min/max bounds.',
      deps: [
        'unavailable',
      ],
      when: () => !this.$.unavailable,
      inputSchema: {
        type: 'object',
        properties: {
          value: FILTER_VALUE_SCHEMA,
        },
        required: [
          'value',
        ],
        additionalProperties: false,
      },
      execute: ({
        value,
      }) => this.edit(value),
    }),
  };

  renderCallback() {
    this.ref.contains.addEventListener('input', this.onInput);
    this.ref.equals.addEventListener('change', this.onInput);
    this.ref.min.addEventListener('input', this.onInput);
    this.ref.max.addEventListener('input', this.onInput);
    for (let key of [
      'filterValue',
      'options',
      'allLabel',
    ]) { this.sub(key, () => this.refresh()); }
  }

  refresh() {
    let value = this.$.filterValue;
    /** @type {import('../../../../../../types/uilib-filter.js').UiFilterRange} */
    let range = value && typeof value === 'object' ? value : {};
    let input = /** @type {HTMLInputElement} */ (this.ref.contains);
    input.value = typeof value === 'string' ? value : '';
    let select = /** @type {HTMLSelectElement} */ (this.ref.equals);
    let options = /** @type {import('../../../../../../types/uilib.js').UiOption[]} */ (this.$.options);
    select.replaceChildren(new Option(String(this.$.allLabel), ''), ...options.map((item) => {
      let option = new Option(item.label, item.value);
      option.disabled = !!item.disabled;
      return option;
    }));
    select.value = typeof value === 'string' ? value : '';
    for (let key of [
      'min',
      'max',
    ]) {
      let bound = range[/** @type {'min' | 'max'} */ (key)];
      let control = /** @type {HTMLInputElement} */ (this.ref[key]);
      control.value = bound === undefined ? '' : String(bound).slice(0, this.$.rangeType === 'date' ? 10 : undefined);
      control.step = this.$.rangeType === 'date' ? '1' : 'any';
    }
    /** @type {HTMLInputElement} */ (this.ref.min).max = /** @type {HTMLInputElement} */ (this.ref.max).value;
    /** @type {HTMLInputElement} */ (this.ref.max).min = /** @type {HTMLInputElement} */ (this.ref.min).value;
  }

  /** @param {unknown} value */
  edit(value) {
    let edit = /** @type {import('./filter.js').Filter['editField']} */ (this.$['^editField']);
    return edit(String(this.$.fieldKey), value);
  }

  onInput = () => {
    if (this.$.isContains) { this.edit(/** @type {HTMLInputElement} */ (this.ref.contains).value); }
    else if (this.$.isEquals) { this.edit(/** @type {HTMLSelectElement} */ (this.ref.equals).value); }
    else {
      let min = /** @type {HTMLInputElement} */ (this.ref.min);
      let max = /** @type {HTMLInputElement} */ (this.ref.max);
      min.max = max.value;
      max.min = min.value;
      if (!min.checkValidity() || !max.checkValidity()) { return; }
      /** @type {import('../../../../../../types/uilib-filter.js').UiFilterRange} */
      let range = {};
      if (min.value) { range.min = this.$.rangeType === 'date' ? min.value : Number(min.value); }
      if (max.value) { range.max = this.$.rangeType === 'date' ? max.value : Number(max.value); }
      this.edit(range);
    }
  };

  destroyCallback() {
    this.ref.contains.removeEventListener('input', this.onInput);
    this.ref.equals.removeEventListener('change', this.onInput);
    this.ref.min.removeEventListener('input', this.onInput);
    this.ref.max.removeEventListener('input', this.onInput);
  }
}

FilterField.template = FILTER_FIELD_TEMPLATE;
