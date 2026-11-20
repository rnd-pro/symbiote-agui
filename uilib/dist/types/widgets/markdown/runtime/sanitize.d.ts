/**
 * @param {string} html
 * @param {string} headingPrefix
 * @param {string} baseUrl
 * @param {boolean} [extensions]
 * @param {{ nodes: number, depth: number, outputBytes: number }} [limits]
 */
export declare function markdownFragment(html: string, headingPrefix: string, baseUrl: string, extensions?: boolean, limits?: {
    nodes: number;
    depth: number;
    outputBytes: number;
}): Promise<DocumentFragment>;
