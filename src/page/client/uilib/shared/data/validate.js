import { DATA_LIMITS } from './constants.js';

/**
 * @param {unknown} value
 * @param {number} max
 */
export let nonempty = (value, max) => typeof value === 'string' && !!value.trim() && value.length <= max;

/** @param {unknown} value */
export let record = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

/** @param {import('../../../../../../types/uilib-data.js').UiDataField[]} fields */
export function validateFields(fields) {
  if (!Array.isArray(fields) || fields.length > DATA_LIMITS.fields || new Set(fields.map((field) => field?.key)).size !== fields.length
    || fields.some((field) => !record(field) || !/^[a-zA-Z_][\w-]*$/.test(field.key) || field.key.length > DATA_LIMITS.key
      || !nonempty(field.label, DATA_LIMITS.text) || ![
        'text',
        'number',
        'date',
        'boolean',
        'status',
      ].includes(field.type))) { throw new Error('invalidFields'); }
  for (let field of fields) {
    if (field.options !== undefined) { validateOptions(field.options); }
  }
}

/** @param {import('../../../../../../types/uilib-data.js').UiDataOption[]} options */
export function validateOptions(options) {
  if (!Array.isArray(options) || options.length > DATA_LIMITS.options
    || new Set(options.map((option) => option?.value)).size !== options.length
    || options.some((option) => !record(option) || !nonempty(option.value, DATA_LIMITS.text) || typeof option.label !== 'string'
      || option.label.length > DATA_LIMITS.text || option.tone !== undefined && ![
        'info',
        'success',
        'warning',
        'danger',
      ].includes(option.tone))) { throw new Error('invalidFields'); }
}

/**
 * @param {import('../../../../../../types/uilib-data.js').UiDataRecord[]} rows
 * @param {string} idKey
 */
export function validateRows(rows, idKey) {
  if (!nonempty(idKey, DATA_LIMITS.key) || !Array.isArray(rows) || rows.length > DATA_LIMITS.rows
    || rows.some((row) => !record(row) || !nonempty(row[idKey], DATA_LIMITS.id))
    || new Set(rows.map((row) => row[idKey])).size !== rows.length) { throw new Error('invalidRows'); }
}

/** @param {string[]} ids */
export function validateIds(ids) {
  if (!Array.isArray(ids) || ids.length > DATA_LIMITS.rows || ids.some((id) => !nonempty(id, DATA_LIMITS.id)) || new Set(ids).size !== ids.length) { throw new Error('invalidState'); }
}

/** @param {string} locale */
export function validateLocale(locale) {
  try { new Intl.Collator(locale); } catch { throw new Error('invalidState'); }
}
