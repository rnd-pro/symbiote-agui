import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { PAGE_REQUEST_TIMEOUT_MS, PAGE_ROLE } from '../transport/constants.js';
import { validateToolRequest } from './request.js';
import { validateToolInput } from './validation.js';

/**
 * @param {import('../server/page-connection.js').PageConnection} connection
 * @param {string} url
 * @param {unknown} input
 * @param {number} deadline
 * @returns {Promise<import('../../types/tools.js').ToolResponse>}
 */
export async function handleToolRequest(connection, url, input, deadline) {
  let request = validateToolRequest(input);
  if (request.action === 'pages') {
    return {
      action: 'pages',
      pages: connection.listPages().map((page) => ({
        ...page,
        url: page.url || url,
      })),
    };
  }
  let pageId = request.pageId;
  if (!pageId) {
    let candidates = [...connection.pages].filter(([, page]) => page.role !== PAGE_ROLE.VIEWER);
    if (candidates.length > 1) {
      throw new CommandError('Several pages are connected. List pages and choose pageId (CLI: pages, then tools --page PAGE_ID).', ERROR_CODE.PAGE_AMBIGUOUS, EXIT_CODE.RUNTIME_ERROR);
    }
    pageId = candidates[0]?.[0];
  }
  let page = pageId ? connection.pages.get(pageId) : undefined;
  if (page?.role === PAGE_ROLE.VIEWER) {
    throw new CommandError('The selected page is a read-only viewer. Select the user page to operate tools.', ERROR_CODE.PAGE_UNAVAILABLE, EXIT_CODE.RUNTIME_ERROR);
  }
  if (!pageId || !page || !page.ready) {
    throw new CommandError(page?.error || 'The selected page is disconnected or not ready. Open the session URL, then list pages again.', ERROR_CODE.PAGE_UNAVAILABLE, EXIT_CODE.RUNTIME_ERROR);
  }
  let discovered = /** @type {import('../../types/tools.js').ToolDiscovery} */ (await connection.request(page.socket, { type: 'tools' }));
  if (!discovered || typeof discovered.discoveryId !== 'string' || !Array.isArray(discovered.tools)) {
    throw new Error('Invalid page discovery response.');
  }
  if (request.action === 'tools') { return { action: 'tools', pageId, ...discovered }; }
  if (request.discoveryId !== discovered.discoveryId) {
    throw new CommandError('The tool catalog changed. Rediscover tools before calling.', ERROR_CODE.TOOL_FAILED, EXIT_CODE.RUNTIME_ERROR);
  }
  let tool = discovered.tools.find((tool) => tool.name === request.name && tool.active);
  if (!tool) { throw new CommandError('The requested tool is unavailable. Rediscover tools.'); }
  validateToolInput(tool.inputSchema, request.input);
  let executionDeadline = Math.min(deadline, Date.now() + PAGE_REQUEST_TIMEOUT_MS);
  if (Date.now() >= executionDeadline) { throw new Error('Tool call expired before execution. It was not started.'); }
  let result = await connection.request(page.socket, {
    type: 'call', name: request.name, discoveryId: discovered.discoveryId, input: request.input, deadline: executionDeadline,
  });
  return { action: 'call', pageId, result: result ?? null };
}
