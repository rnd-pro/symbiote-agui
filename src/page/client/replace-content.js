import { DICT } from '@symbiotejs/symbiote';
import { AguiComponent } from './component.js';
import { PROVIDER_TAG } from './constants.js';
import { createContext, resetContexts } from './contexts.js';
import { readInitialData } from './data.js';

/**
 * @param {DocumentFragment} fragment
 * @returns {DocumentFragment[]}
 */
function templateFragments(fragment) {
  return [fragment, ...[...fragment.querySelectorAll('template')].flatMap((template) => templateFragments(template.content))];
}

/**
 * @param {HTMLElement} root
 * @param {DocumentFragment} fragment
 */
export function replaceContent(root, fragment) {
  let fragments = templateFragments(fragment);
  /** @type {Set<string>} */
  let tags = new Set();
  /** @type {Map<string, import('../../../types/components.js').ComponentState>} */
  let providers = new Map();

  for (let part of fragments) {
    for (let element of part.querySelectorAll('*')) {
      let definition = customElements.get(element.localName);
      if (definition === AguiComponent || definition?.prototype instanceof AguiComponent || element.hasAttribute(DICT.USE_TPL_ATTR)) {
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
        if (!(template instanceof HTMLTemplateElement) || !element.localName.includes('-')) {
          throw new Error(`use-template requires a custom element and a template in the inserted markup: ${selector}.`);
        }
        tags.add(element.localName);
      }

      if (element.localName === PROVIDER_TAG) {
        let data = readInitialData(element);
        let name = element.getAttribute(DICT.CTX_NAME_ATTR)?.trim();
        // Contexts inside templates are initialized only when their provider is mounted.
        if (part === fragment && name) {
          if (providers.has(name)) {
            throw new Error(`Only one context-provider per named context is allowed: ${name}.`);
          }
          providers.set(name, data);
        }
      }
    }
  }

  for (let tag of tags) {
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends AguiComponent {});
    }
  }

  resetContexts();
  for (let [name, data] of providers) {
    createContext(name, data);
  }
  root.replaceChildren(fragment);
}
