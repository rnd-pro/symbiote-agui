import { DATA_LIMITS } from '../../shared/data/constants.js';
import { rangeValue } from '../../shared/data/values.js';
import { validateFields, validateRows, validateLocale, record } from '../../shared/data/validate.js';

/** @param {import('../../../../../../types/uilib-filter.js').UiFilterState} state */
export function validateFilter(state) {
  validateFields(state.fields);
  validateRows(state.rows, state.idKey);
  validateLocale(state.locale);
  for (let field of state.fields) {
    let allowed = {
      text: [
        'contains',
        ...(field.options ? [
          'equals',
        ] : []),
      ],
      number: [
        'range',
      ],
      date: [
        'range',
      ],
      boolean: [
        'equals',
      ],
      status: field.options ? [
        'equals',
      ] : [],
    };
    if (field.filter !== undefined && !allowed[field.type].includes(field.filter)) { throw new Error('invalidFields'); }
  }
  if (typeof state.query !== 'string' || state.query.length > DATA_LIMITS.text || !record(state.value)
    || Object.keys(state.value).length > DATA_LIMITS.fields) { throw new Error('invalidState'); }
  for (let [
    key,
    filter,
  ] of Object.entries(state.value)) {
    let field = state.fields.find((item) => item.key === key && item.filter);
    if (!field) { throw new Error('invalidState'); }
    if (field.filter === 'range') {
      if (!record(filter) || Object.keys(filter).some((key) => ![
        'min',
        'max',
      ].includes(key))) { throw new Error('invalidState'); }
      let range = /** @type {import('../../../../../../types/uilib-filter.js').UiFilterRange} */ (filter);
      let min = rangeValue(field, range.min);
      let max = rangeValue(field, range.max, true);
      if (Number.isNaN(min) || Number.isNaN(max) || min !== null && max !== null && min > max) { throw new Error('invalidState'); }
    } else {
      if (typeof filter !== 'string' || filter.length > DATA_LIMITS.text) { throw new Error('invalidState'); }
      let choices = field.type === 'boolean' ? [
        'true',
        'false',
      ] : field.options?.filter((option) => !option.disabled).map((option) => option.value);
      if (field.filter === 'equals' && filter && !choices?.includes(filter)) { throw new Error('invalidState'); }
    }
  }
}
