import { getActiveWebMCPTools, executeWebMCPTool as executeNativeTool } from '@symbiotejs/symbiote/webmcp';
import { withoutFeedback } from './feedback-guard.js';

/** @returns {import('@symbiotejs/symbiote/webmcp').WebMCPRegistryEntry[]} */
export function listPageTools() {
  return getActiveWebMCPTools();
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} [input]
 * @returns {Promise<unknown>}
 */
export async function executePageTool(name, input = {}) {
  return executeWebMCPTool(name, input);
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} [input]
 */
export function executeWebMCPTool(name, input = {}) {
  return withoutFeedback(() => executeNativeTool(name, input));
}
