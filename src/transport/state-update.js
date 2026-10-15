/**
 * @param {unknown} input
 * @returns {import('../../types/transport.js').StateUpdate}
 */
export function validateStateUpdate(input) {
  let update = /** @type {import('../../types/transport.js').StateUpdate | undefined} */ (input);
  if (!update || typeof update !== 'object' || typeof update.selector !== 'string' || !update.selector.trim()
    || !update.values || typeof update.values !== 'object' || Array.isArray(update.values)
    || (update.method !== undefined && !['set$', 'add$'].includes(update.method))
    || (update.rewrite !== undefined && typeof update.rewrite !== 'boolean')) {
    throw new Error('Expected { selector, values, method?: "set$" | "add$", rewrite?: boolean }.');
  }
  if (Object.keys(update.values).some((key) => ['__proto__', 'constructor', 'prototype'].includes(key))) {
    throw new Error('State values contain a reserved property name.');
  }
  return { selector: update.selector, values: update.values, method: update.method || 'set$', rewrite: update.rewrite || false };
}
