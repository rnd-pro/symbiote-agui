import { getActiveWebMCPTools, executeWebMCPTool } from '@symbiotejs/symbiote/webmcp';

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
