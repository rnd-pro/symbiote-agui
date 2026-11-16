import { Symbiote } from '@symbiotejs/symbiote';
import { SymContext } from '@symbiotejs/symbiote/html-app';
import { analyzeFragment } from '../markup/fragment.js';
import { dataTargets } from '../data/targets.js';

/**
 * @param {HTMLElement} root
 * @param {DocumentFragment} fragment
 */
export function replaceContent(root, fragment) {
  analyzeFragment(fragment);
  let content = document.importNode(fragment, true);
  for (let {
    element,
    keys,
    values,
  } of dataTargets(content).values()) {
    if (!(element instanceof SymContext)) {
      throw new TypeError('AGUI persistence requires an HTML-app context owner.');
    }
    // Worker-provided values, including restored commits, are incoming data,
    // so an automatic JSON defaults request cannot replace them.
    element.$ = Object.fromEntries(keys.map((key) => [
      key,
      values[key],
    ]));
  }
  let previous = [...root.querySelectorAll('*')].reverse();
  root.replaceChildren();
  // Release named owners before new markup claims the same context names.
  for (let element of previous) {
    if (element instanceof Symbiote) { element.destroy(); }
  }
  root.append(content);
}
