import { DICT } from '@symbiotejs/symbiote/core/dictionary.js';
import { DATA_SELECTOR } from './constants.js';

/**
 * @param {unknown} key
 * @returns {key is string}
 */
export function isPlainStateKey(key) {
  return typeof key === 'string' && !!key && !['__proto__', 'constructor', 'prototype'].includes(key)
    && !/^[*^@+]/.test(key) && !key.startsWith('--') && !key.includes('/');
}

/**
 * @param {Element} element
 * @returns {import('../../types/components.js').ComponentState}
 */
export function readInitialData(element) {
  let scripts = element.querySelectorAll(DATA_SELECTOR);
  if (scripts.length > 1) {
    throw new Error(`${element.localName} accepts one direct JSON data script.`);
  }
  let script = scripts[0];
  if (!script) {
    return {};
  }
  let data;
  try {
    data = JSON.parse(script.textContent || '');
  } catch {
    throw new Error(`Invalid JSON data in ${element.localName}.`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`JSON data in ${element.localName} must be an object.`);
  }
  for (let key of Object.keys(data)) {
    if (!isPlainStateKey(key)) {
      throw new Error(`JSON data requires plain state keys: ${key}.`);
    }
  }
  script.setAttribute(DICT.TEXT_NODE_SKIP_ATTR, '');
  return data;
}
