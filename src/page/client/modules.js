import { MODULE_SELECTOR } from '../../transport/constants.js';
import { emit, submitFeedback } from './events.js';

/** @type {import('../../../types/transport.js').ModuleCleanup[]} */
let cleanups = [];

export async function disposeModules() {
  let previous = cleanups;
  cleanups = [];
  for (let cleanup of previous.reverse()) {
    await cleanup();
  }
}

/**
 * @param {DocumentFragment} fragment
 * @returns {Promise<import('../../../types/transport.js').PageModule[]>}
 */
export async function loadModules(fragment) {
  /** @type {import('../../../types/transport.js').PageModule[]} */
  let modules = [];
  for (let script of fragment.querySelectorAll(MODULE_SELECTOR)) {
    let url = URL.createObjectURL(new Blob([script.textContent || ''], { type: 'text/javascript' }));
    try {
      modules.push(await import(url));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return modules;
}

/**
 * @param {HTMLElement} root
 * @param {import('../../../types/transport.js').PageModule[]} modules
 */
export async function mountModules(root, modules) {
  for (let module of modules) {
    if (typeof module.default === 'function') {
      let cleanup = await module.default(root, { emit, submitFeedback });
      if (typeof cleanup === 'function') { cleanups.push(cleanup); }
    }
  }
}
