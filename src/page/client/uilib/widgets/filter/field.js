import { ToolDescriptor } from '@symbiotejs/symbiote/webmcp';
import { UiComponent } from '../../shared/component.js';
import { FILTER_VALUE_SCHEMA } from './schemas.js';
import { FILTER_FIELD_TEMPLATE } from './template.js';

export class FilterField extends UiComponent {
  refreshing = true;
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
    containsValue: '',
    equalsValue: '',
    minValue: '',
    maxValue: '',
    rangeStep: 'any',
    selectOptions: [],
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
    for (let key of [
      'filterValue',
      'options',
      'allLabel',
    ]) { this.sub(key, () => this.refresh()); }
    for (let key of [
      'containsValue',
      'equalsValue',
      'minValue',
      'maxValue',
    ]) { this.sub(key, () => { if (!this.refreshing) { this.onInput(); } }); }
    this.refreshing = false;
  }

  refresh() {
    let value = this.$.filterValue;
    /** @type {import('../../../../../../types/uilib-filter.js').UiFilterRange} */
    let range = value && typeof value === 'object' ? value : {};
    let options = /** @type {import('../../../../../../types/uilib.js').UiOption[]} */ (this.$.options);
    let text = typeof value === 'string' ? value : '';
    let bound = (/** @type {number | string | undefined} */ value) => value === undefined ? '' : String(value).slice(0, this.$.rangeType === 'date' ? 10 : undefined);
    // Incoming filter values update controls without publishing another edit.
    let refreshing = this.refreshing;
    this.refreshing = true;
    try {
      this.set$({
        containsValue: text,
        equalsValue: text,
        minValue: bound(range.min),
        maxValue: bound(range.max),
        rangeStep: this.$.rangeType === 'date' ? '1' : 'any',
        selectOptions: [
          {
            value: '',
            label: String(this.$.allLabel),
          },
          ...options,
        ],
      });
    } finally {
      this.refreshing = refreshing;
    }
  }

  /** @param {unknown} value */
  edit(value) {
    let edit = /** @type {import('./filter.js').Filter['editField']} */ (this.$['^editField']);
    return edit(String(this.$.fieldKey), value);
  }

  onInput = () => {
    if (this.$.isContains) { this.edit(this.$.containsValue); }
    else if (this.$.isEquals) { this.edit(this.$.equalsValue); }
    else {
      let min = /** @type {import('../../controls/field/field.js').Field} */ (this.ref.min).control;
      let max = /** @type {import('../../controls/field/field.js').Field} */ (this.ref.max).control;
      if (!(min instanceof HTMLInputElement) || !(max instanceof HTMLInputElement)) { return; }
      if (!min.checkValidity() || !max.checkValidity()) { return; }
      /** @type {import('../../../../../../types/uilib-filter.js').UiFilterRange} */
      let range = {};
      if (min.value) { range.min = this.$.rangeType === 'date' ? min.value : Number(min.value); }
      if (max.value) { range.max = this.$.rangeType === 'date' ? max.value : Number(max.value); }
      this.edit(range);
    }
  };
}

FilterField.template = FILTER_FIELD_TEMPLATE;
