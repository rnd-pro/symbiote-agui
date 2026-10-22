import { PubSub } from '@symbiotejs/symbiote';
import { RESERVED_PROVIDER_NAMES } from '../../markup/constants.js';

/** @type {Map<string, PubSub<import('../../../types/components.js').ComponentState>>} */
let contexts = new Map();

export function resetContexts() {
  for (let [name, context] of contexts) {
    releaseContext(name, context);
  }
}

/**
 * @param {string} name
 * @param {import('../../../types/components.js').ComponentState} data
 */
export function createContext(name, data) {
  if (RESERVED_PROVIDER_NAMES.includes(name)) { throw new Error('This context name is reserved by AGUI.'); }
  PubSub.deleteCtx(name);
  let context = PubSub.registerCtx(data, name);
  contexts.set(name, context);
  return context;
}

/**
 * @param {string} name
 * @param {import('../../../types/components.js').ComponentState} data
 */
export function initializeContext(name, data) {
  if (RESERVED_PROVIDER_NAMES.includes(name)) { throw new Error('This context name is reserved by AGUI.'); }
  let context = PubSub.getCtx(name, false);
  if (!context) {
    return createContext(name, data);
  }
  contexts.set(name, context);
  for (let [key, value] of Object.entries(data)) {
    context.add(key, value, true);
  }
  return context;
}

/**
 * @param {string} name
 * @param {PubSub<import('../../../types/components.js').ComponentState>} context
 */
export function releaseContext(name, context) {
  if (contexts.get(name) !== context) {
    return;
  }
  if (PubSub.getCtx(name, false) === context) {
    PubSub.deleteCtx(name);
  }
  contexts.delete(name);
}
