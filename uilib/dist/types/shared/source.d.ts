/** @type {(requestedUrl: string, response: Response, pageUrl?: string) => string} */
declare let resolveTextSource: (requestedUrl: string, response: Response, pageUrl?: string) => string;
/** @param {typeof resolveTextSource} resolver */
export declare function setTextSourceResolver(resolver: typeof resolveTextSource): () => void;
/**
 * @param {string} source
 * @param {string} base
 */
export declare function sourceUrl(source: string, base: string): string;
/**
 * @param {string} url
 * @param {AbortSignal} signal
 * @param {{ inputBytes: number, fetchTimeoutMs: number }} limits
 * @param {string} [pageUrl]
 */
export declare function fetchTextSource(url: string, signal: AbortSignal, limits: {
    inputBytes: number;
    fetchTimeoutMs: number;
}, pageUrl?: string): Promise<{
    text: string;
    url: string;
}>;
export {};
