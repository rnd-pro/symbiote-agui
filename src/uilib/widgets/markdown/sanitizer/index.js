import DOMPurify from 'dompurify';
/**
 * @param {string} html
 * @param {ReturnType<typeof import('../runtime/policy.js').markdownPolicy>} policy
 */
export function sanitizeMarkdown(html, policy) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      ...policy.elements,
      '#text',
    ],
    ALLOWED_ATTR: policy.attributes,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    CUSTOM_ELEMENT_HANDLING: {
      tagNameCheck: (name) => policy.customTags.has(name),
      attributeNameCheck: (name) => policy.attributes.includes(name),
    },
    RETURN_DOM_FRAGMENT: true,
  });
}
