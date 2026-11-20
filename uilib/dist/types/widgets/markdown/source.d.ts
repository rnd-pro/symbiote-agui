export { sourceUrl as markdownSourceUrl } from '../../shared/source.js';
/**
 * @param {string} url
 * @param {AbortSignal} signal
 * @param {string} [pageUrl]
 */
export declare function fetchMarkdownSource(url: string, signal: AbortSignal, pageUrl?: string): Promise<{
    text: string;
    url: string;
}>;
