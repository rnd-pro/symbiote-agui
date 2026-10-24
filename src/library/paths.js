import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getSettings } from '../config/settings.js';
import { assertSessionId, sessionKey } from '../sessions/identity.js';
import { SESSION_ID_PATTERN } from '../sessions/constants.js';
import { getDefaultStateRoot } from '../sessions/store.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';

export function getDefaultDefinitionFolder() {
  return join(getDefaultStateRoot(), '.cache');
}

/** @param {string} sessionId */
export function definitionPaths(sessionId) {
  assertSessionId(sessionId);
  let folder = getSettings().folder;
  let directory = folder || getDefaultDefinitionFolder();
  let name = folder ? sessionId : sessionKey(sessionId);
  return { htmlPath: join(directory, `${name}.html`), descriptionPath: join(directory, `${name}.md`) };
}

/** @param {string} directory */
async function entries(directory) {
  try { return await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if (hasErrorCode(error, 'ENOENT')) { return []; }
    throw error;
  }
}

export async function listDefinitionIds() {
  let folder = getSettings().folder;
  let files = await entries(folder || getDefaultDefinitionFolder());
  let names = files.filter((file) => file.isFile() && file.name.endsWith('.html')).map((file) => file.name.slice(0, -5));
  let ids = folder ? names : names.filter((key) => /^(?:[a-f0-9]{2}){1,64}$/.test(key)).map((key) => Buffer.from(key, 'hex').toString('utf8'));
  return ids.filter((id) => SESSION_ID_PATTERN.test(id)).sort();
}

/** @param {string} sessionId */
export async function assertPortableName(sessionId) {
  let folder = getSettings().folder;
  if (!folder) { return; }
  let files = await entries(folder);
  let expected = [`${sessionId}.html`, `${sessionId}.md`];
  let collision = files.find((file) => expected.some((name) => name.toLowerCase() === file.name.toLowerCase() && name !== file.name));
  if (collision) {
    throw new CommandError(`AGUI ${sessionId} conflicts with ${collision.name}. Use names that differ beyond letter case in a shared folder.`, ERROR_CODE.CACHE_ERROR, EXIT_CODE.RUNTIME_ERROR);
  }
}
