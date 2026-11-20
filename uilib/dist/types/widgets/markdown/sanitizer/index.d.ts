/**
 * @param {string} html
 * @param {ReturnType<typeof import('../runtime/policy.js').markdownPolicy>} policy
 */
export declare function sanitizeMarkdown(html: string, policy: ReturnType<typeof import('../runtime/policy.js').markdownPolicy>): DocumentFragment;
