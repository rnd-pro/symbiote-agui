import { CONTENT_ROOT_ID, STYLESHEET_ID, STYLESHEET_TIMEOUT_MS } from '../../markup/constants.js';
import { analyzeFragment } from '../../markup/fragment.js';
import { validateStateUpdate } from '../../transport/state-update.js';
import { replaceContent } from './replace-content.js';
import { disposeModules, loadModules, mountModules } from './modules.js';
import { syncPageIdentity } from './identity.js';

/** @param {import('../../../types/transport.js').RenderUpdate} update */
export async function renderMarkup(update) {
  let root = document.getElementById(CONTENT_ROOT_ID);
  let previous = document.getElementById(STYLESHEET_ID);
  if (!root || !(previous instanceof HTMLLinkElement)) {
    throw new Error('The AGUI page shell is missing. Reload the session URL.');
  }
  let template = document.createElement('template');
  template.innerHTML = update.html;
  analyzeFragment(template.content);
  let next = document.createElement('link');
  next.rel = 'stylesheet';
  next.href = update.stylesheetUrl;
  try {
    await new Promise((resolve, reject) => {
      let timer = window.setTimeout(() => reject(new Error('Timed out loading generated styles.')), STYLESHEET_TIMEOUT_MS);
      next.onload = () => { clearTimeout(timer); resolve(undefined); };
      next.onerror = () => { clearTimeout(timer); reject(new Error('Could not load generated styles.')); };
      document.head.append(next);
    });
    let modules = await loadModules(template.content);
    await disposeModules();
    replaceContent(root, template.content);
    await mountModules(root, modules);
    previous.remove();
    next.id = STYLESHEET_ID;
  } catch (error) {
    next.remove();
    throw error;
  } finally {
    syncPageIdentity();
    next.onload = null;
    next.onerror = null;
  }
}

/** @param {import('../../../types/transport.js').StateUpdate} input */
export function updateState(input) {
  let update = validateStateUpdate(input);
  let elements = [...(document.getElementById(CONTENT_ROOT_ID)?.querySelectorAll(update.selector) || [])];
  if (!elements.length) { throw new Error(`No component matches ${update.selector}.`); }
  let method = update.method || 'set$';
  let components = elements.map((element) => /** @type {import('../../../types/components.js').ComponentHost} */ (element));
  if (components.some((element) => typeof element[method] !== 'function')) {
    throw new Error('State updates require Symbiote components.');
  }
  for (let component of components) {
    component[method](update.values, update.rewrite);
  }
  syncPageIdentity();
}
