import { writeFile } from 'node:fs/promises';
import { definitionPaths } from './paths.js';
import { readOptional, storageError } from './files.js';
import { hasErrorCode } from '../shared/system-error.js';

/** @param {string} sessionId */
export function defaultDescription(sessionId) {
  return `# ${sessionId}\n\nInteractive workspace for ${sessionId}.\n\n## Purpose\n\nDescribe the task, intended users, and when to reuse this AGUI.\n\n## Usage\n\nRun \`npx symbiote-agui start ${sessionId}\`.\n\n## Data and actions\n\nDocument data sources, available actions, and persistence requirements.\n`;
}

/**
 * @param {string} sessionId
 * @param {string} [text]
 */
export async function ensureDescription(sessionId, text = defaultDescription(sessionId)) {
  let { descriptionPath } = definitionPaths(sessionId);
  try {
    await writeFile(descriptionPath, text, { flag: 'wx', mode: 0o600 });
    return true;
  } catch (error) {
    if (hasErrorCode(error, 'EEXIST')) { return false; }
    throw storageError(descriptionPath, error);
  }
}

/**
 * @param {string} sessionId
 * @returns {Promise<import('../../types/library.js').DefinitionInfo>}
 */
export async function definitionInfo(sessionId) {
  let paths = definitionPaths(sessionId);
  let description = await readOptional(paths.descriptionPath) ?? '';
  let title = description.match(/^#\s+(.+)$/m)?.[1]?.trim() || sessionId;
  let summary = description.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#'))?.trim() || '';
  return { sessionId, ...paths, title, summary, description };
}
