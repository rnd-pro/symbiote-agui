import { CommandError } from '../shared/command-error.js';

/**
 * @param {unknown} input
 * @returns {import('../../types/tools.js').ToolRequest}
 */
export function validateToolRequest(input) {
  let request = /** @type {import('../../types/tools.js').ToolRequest} */ (input);
  if (!request || typeof request !== 'object' || !['pages', 'tools', 'call'].includes(request.action)) {
    throw new CommandError('Unknown tool operation.');
  }
  if (request.action === 'pages') { return { action: 'pages' }; }
  if (request.pageId !== undefined && (typeof request.pageId !== 'string' || !request.pageId)) {
    throw new CommandError('pageId must be a nonempty string.');
  }
  if (request.action === 'tools') { return { action: 'tools', pageId: request.pageId }; }
  if (!request.pageId || typeof request.discoveryId !== 'string' || !request.discoveryId
    || typeof request.name !== 'string' || !request.name
    || !request.input || typeof request.input !== 'object' || Array.isArray(request.input)) {
    throw new CommandError('Tool calls require pageId, discoveryId, name, and object input.');
  }
  return { action: 'call', pageId: request.pageId, discoveryId: request.discoveryId, name: request.name, input: request.input };
}
