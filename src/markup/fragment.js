import { DICT } from '@symbiotejs/symbiote/core/dictionary.js';
import { PROVIDER_TAG, RESERVED_PROVIDER_NAMES } from './constants.js';
import { readInitialData } from './data.js';
import { MODULE_SELECTOR } from '../transport/constants.js';
import { dataTargets } from '../data/targets.js';
import { PERSIST_ATTRIBUTE } from '../data/constants.js';

/**
 * @param {DocumentFragment} fragment
 * @returns {DocumentFragment[]}
 */
function templateFragments(fragment) {
  return [fragment, ...[...fragment.querySelectorAll('template')].flatMap((template) => templateFragments(template.content))];
}

/**
 * @param {DocumentFragment} fragment
 * @returns {import('../../types/transport.js').FragmentAnalysis}
 */
export function analyzeFragment(fragment) {
  dataTargets(fragment);
  let fragments = templateFragments(fragment);
  /** @type {Set<string>} */
  let classes = new Set();
  /** @type {Set<string>} */
  let tags = new Set();
  /** @type {import('../../types/transport.js').FragmentAnalysis['providers']} */
  let providers = new Map();
  for (let part of fragments) {
    if (part !== fragment && part.querySelector(`[${PERSIST_ATTRIBUTE}]`)) {
      throw new Error('Persisted providers must be declared outside reusable templates.');
    }
    for (let element of part.querySelectorAll('*')) {
      if (element.matches(MODULE_SELECTOR) && element.hasAttribute('src')) {
        throw new Error('AGUI modules must be inline.');
      }
      for (let name of element.classList) {
        classes.add(name);
      }
      if (element.localName.includes('-')) {
        readInitialData(element);
      }
      let selector = element.getAttribute(DICT.USE_TPL_ATTR);
      if (selector !== null) {
        let template;
        try {
          template = fragments.map((scope) => scope.querySelector(selector)).find(Boolean);
        } catch {
          throw new Error(`Invalid use-template selector: ${selector}.`);
        }
        if (template?.localName !== 'template' || !element.localName.includes('-')) {
          throw new Error(`use-template requires a custom element and a template in the inserted markup: ${selector}.`);
        }
        tags.add(element.localName);
      }
      if (element.localName === PROVIDER_TAG) {
        let data = readInitialData(element);
        let name = element.getAttribute(DICT.CTX_NAME_ATTR)?.trim();
        if (name && RESERVED_PROVIDER_NAMES.includes(name)) { throw new Error('This provider name is reserved by AGUI.'); }
        if (part === fragment && name) {
          if (providers.has(name)) {
            throw new Error(`Only one context-provider per named context is allowed: ${name}.`);
          }
          providers.set(name, data);
        }
      }
    }
  }
  return { classes: [...classes], tags, providers };
}
