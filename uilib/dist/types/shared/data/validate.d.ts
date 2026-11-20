/**
 * @param {unknown} value
 * @param {number} max
 */
export declare let nonempty: (value: unknown, max: number) => boolean;
/** @param {unknown} value */
export declare let record: (value: unknown) => boolean;
/** @param {import('../../types/uilib-data.js').UiDataField[]} fields */
export declare function validateFields(fields: import('../../types/uilib-data.js').UiDataField[]): void;
/** @param {import('../../types/uilib-data.js').UiDataOption[]} options */
export declare function validateOptions(options: import('../../types/uilib-data.js').UiDataOption[]): void;
/**
 * @param {import('../../types/uilib-data.js').UiDataRecord[]} rows
 * @param {string} idKey
 */
export declare function validateRows(rows: import('../../types/uilib-data.js').UiDataRecord[], idKey: string): void;
/** @param {string[]} ids */
export declare function validateIds(ids: string[]): void;
/** @param {string} locale */
export declare function validateLocale(locale: string): void;
