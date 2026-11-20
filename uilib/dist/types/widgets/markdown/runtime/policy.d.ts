export declare let MARKDOWN_INERT_WRAPPERS: readonly string[];
export declare let MARKDOWN_ELEMENTS: readonly string[];
export declare let MARKDOWN_SAFE_ATTRIBUTES: readonly string[];
/**
 * @param {string} html
 * @param {boolean} [extensions]
 */
export declare function markdownPolicy(html: string, extensions?: boolean): {
    elements: any[];
    attributes: string[];
    customTags: Set<any>;
    unwrappedTags: Set<any>;
};
/**
 * @param {string} value
 * @param {string} [base]
 */
export declare function linkDestination(value: string, base?: string): string | undefined;
/**
 * @param {string} value
 * @param {string} base
 */
export declare function resourceDestination(value: string, base: string): string | undefined;
/**
 * @param {string} value
 * @param {string} base
 */
export declare function resourceSourceSet(value: string, base: string): string | undefined;
