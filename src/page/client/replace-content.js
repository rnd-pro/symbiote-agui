import { AguiComponent } from './component.js';
import { createContext, resetContexts } from './contexts.js';
import { analyzeFragment } from '../../markup/fragment.js';

/**
 * @param {HTMLElement} root
 * @param {DocumentFragment} fragment
 */
export function replaceContent(root, fragment) {
  let { tags, providers } = analyzeFragment(fragment);
  for (let tag of tags) {
    if (!customElements.get(tag)) {
      class GeneratedComponent extends AguiComponent {}
      GeneratedComponent.reg(tag);
    }
  }
  resetContexts();
  for (let [name, data] of providers) {
    createContext(name, data);
  }
  root.replaceChildren(fragment);
}
