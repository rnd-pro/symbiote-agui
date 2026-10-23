let numberLocale = '';
/** @type {Intl.NumberFormat | undefined} */
let numberFormat;

/**
 * @param {unknown} value
 */
export function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) { return null; }
  let day = value.slice(0, 10);
  let date = Date.parse(day);
  if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== day) { return null; }
  let result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

/**
 * @param {import('../../../../../../types/uilib-data.js').UiDataRecord} row
 * @param {import('../../../../../../types/uilib-data.js').UiDataField} column
 */
export function cellValue(row, column) {
  let raw = row[column.key];
  if (raw === null || raw === undefined) { return null; }
  let readers = {
    text: () => typeof raw === 'string' || typeof raw === 'boolean' || typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : null,
    status: () => typeof raw === 'string' ? raw : null,
    number: () => typeof raw === 'number' && Number.isFinite(raw) ? raw : null,
    boolean: () => typeof raw === 'boolean' ? Number(raw) : null,
    date: () => isoDate(raw),
  };
  return readers[column.type]();
}

/**
 * @param {import('../../../../../../types/uilib-data.js').UiDataRecord} row
 * @param {import('../../../../../../types/uilib-data.js').UiDataField} column
 * @param {{ locale: string; texts: import('../../../../../../types/uilib.js').UiTexts }} state
 */
export function cellText(row, column, state) {
  let value = cellValue(row, column);
  if (value === null) { return ''; }
  let formats = {
    text: () => String(value),
    status: () => column.options?.find((option) => option.value === value)?.label ?? String(value),
    number: () => {
      if (!numberFormat || numberLocale !== state.locale) {
        numberFormat = new Intl.NumberFormat(state.locale);
        numberLocale = state.locale;
      }
      return numberFormat.format(/** @type {number} */ (value));
    },
    boolean: () => String(state.texts?.[value ? 'trueLabel' : 'falseLabel'] ?? ''),
    date: () => String(row[column.key]),
  };
  return formats[column.type]();
}

/**
 * @param {import('../../../../../../types/uilib-data.js').UiDataField} column
 * @param {number | string | undefined} value
 * @param {boolean} [upper]
 */
export function rangeValue(column, value, upper = false) {
  if (value === undefined) { return null; }
  if (column.type === 'number') { return typeof value === 'number' && Number.isFinite(value) ? value : NaN; }
  let date = isoDate(value);
  if (date === null) { return NaN; }
  return date + (upper && typeof value === 'string' && value.length === 10 ? 86_400_000 - 1 : 0);
}
