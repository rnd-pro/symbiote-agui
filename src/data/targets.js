import { DATA_SELECTOR, RESERVED_PROVIDER_NAMES } from '../markup/constants.js';
import { readInitialData, isPlainStateKey } from '../markup/data.js';
import { PERSIST_ATTRIBUTE, DATA_LIMITS } from './constants.js';
import { jsonData } from './validate.js';

/**
 * @param {ParentNode} fragment
 * @returns {Map<string, { element: Element; script: Element; keys: string[]; values: import('../../types/components.js').ComponentState }>}
 */
export function dataTargets(fragment) {
  let targets = new Map();
  for (let element of fragment.querySelectorAll(`[${PERSIST_ATTRIBUTE}]`)) {
    let provider = element.getAttribute('ctx')?.trim() || '';
    let keys = element.getAttribute(PERSIST_ATTRIBUTE)?.trim().split(/\s+/) || [];
    let scripts = element.querySelectorAll(DATA_SELECTOR);
    if (!element.localName.includes('-') || !provider || provider.length > 128 || RESERVED_PROVIDER_NAMES.includes(provider)
      || scripts.length !== 1 || scripts[0].hasAttribute('src') || !keys.length || keys.length > DATA_LIMITS.keys
      || keys.some((key) => !isPlainStateKey(key)) || new Set(keys).size !== keys.length || targets.has(provider)) {
      throw new Error('persist requires a unique named provider, declared keys, and one direct inline JSON script.');
    }
    let values = readInitialData(element);
    for (let key of keys) {
      if (!Object.hasOwn(values, key)) { throw new Error(`Persisted key is missing from inline JSON: ${key}.`); }
      jsonData(values[key]);
    }
    targets.set(provider, { element, script: scripts[0], keys, values });
  }
  if (targets.size > DATA_LIMITS.targets) { throw new Error('Too many persisted providers.'); }
  return targets;
}

/**
 * @param {Element} script
 * @param {import('../../types/components.js').ComponentState} values
 */
export function writeDataScript(script, values) {
  script.textContent = JSON.stringify(values).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
