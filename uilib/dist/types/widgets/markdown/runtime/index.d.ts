export { setLibraryAssetBase } from '../../../shared/assets.js';
/** @param {string} source */
export declare function markdownHtml(source: string): Promise<string>;
/**
 * @param {string} source
 * @param {string} headingPrefix
 * @param {string} [baseUrl]
 * @param {boolean} [extensions]
 */
export declare function renderMarkdown(source: string, headingPrefix: string, baseUrl?: string, extensions?: boolean): Promise<DocumentFragment>;
/**
 * Render inert source with JSDA's highlighter, independently of document limits.
 * @param {string} source
 * @param {string} language
 * @param {number} inputBytes
 */
export declare function renderCode(source: string, language: string, inputBytes: number): Promise<Element>;
