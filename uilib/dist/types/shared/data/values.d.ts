/**
 * @param {unknown} value
 */
export declare function isoDate(value: unknown): number | null;
/**
 * @param {import('../../types/uilib-data.js').UiDataRecord} row
 * @param {import('../../types/uilib-data.js').UiDataField} column
 */
export declare function cellValue(row: import('../../types/uilib-data.js').UiDataRecord, column: import('../../types/uilib-data.js').UiDataField): string | number | null;
/**
 * @param {import('../../types/uilib-data.js').UiDataRecord} row
 * @param {import('../../types/uilib-data.js').UiDataField} column
 * @param {{ locale: string; texts: import('../../types/uilib.js').UiTexts }} state
 */
export declare function cellText(row: import('../../types/uilib-data.js').UiDataRecord, column: import('../../types/uilib-data.js').UiDataField, state: {
    locale: string;
    texts: import('../../types/uilib.js').UiTexts;
}): string;
/**
 * @param {import('../../types/uilib-data.js').UiDataField} column
 * @param {number | string | undefined} value
 * @param {boolean} [upper]
 */
export declare function rangeValue(column: import('../../types/uilib-data.js').UiDataField, value: number | string | undefined, upper?: boolean): number | null;
