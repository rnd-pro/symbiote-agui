import { readMarkup } from '../markup/read-input.js';
import { CommandError } from '../shared/command-error.js';
import { requestTools } from '../tools/client.js';

/**
 * @param {string} sessionId
 * @param {string | undefined} file
 */
export async function callTool(sessionId, file) {
  let source = await readMarkup(file);
  let input;
  try { input = JSON.parse(source); }
  catch { throw new CommandError('Tool call input must be valid JSON.'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new CommandError('Tool call input must be an object with pageId, discoveryId, name, and input.');
  }
  return requestTools(sessionId, { ...input, action: 'call' });
}
