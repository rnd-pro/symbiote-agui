import { createHash } from 'node:crypto';
import { basename, isAbsolute } from 'node:path';
import { opendir, realpath } from 'node:fs/promises';
import { canonicalPath } from '../shared/paths.js';
import { CommandError } from '../shared/command-error.js';
import { errorMessage } from '../shared/system-error.js';

/** @param {unknown} value */
export function validProjectId(value) {
  return typeof value === 'string' && /^(?:default|[a-f0-9]{64})$/.test(value);
}

/** @param {unknown} value */
export function validFolder(value) {
  return typeof value === 'string' && !!value.trim() && value.length <= 4096 && !value.includes('\0');
}

/** @param {string | undefined} folder */
export function projectId(folder) {
  return folder ? createHash('sha256').update(canonicalPath(folder)).digest('hex') : 'default';
}

/**
 * @param {string | undefined} folder
 * @returns {import('../../types/projects.js').ConnectedProject}
 */
export function projectEntry(folder) {
  let path = folder ? canonicalPath(folder) : undefined;
  return {
    id: projectId(path),
    name: path ? basename(path) || path : 'Default',
    ...(path ? {
      folder: path,
    } : {}),
    lastUsedAt: null,
  };
}

/** @param {unknown} value */
export function validProject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { return false; }
  let entry = /** @type {import('../../types/projects.js').ConnectedProject} */ (value);
  if (Object.keys(value).some((key) => ![
    'id',
    'name',
    'folder',
    'lastUsedAt',
  ].includes(key)) || !validProjectId(entry.id) || typeof entry.name !== 'string' || !entry.name.trim()
    || (entry.lastUsedAt !== null && (typeof entry.lastUsedAt !== 'string' || !Number.isFinite(Date.parse(entry.lastUsedAt))))) { return false; }
  return entry.id === 'default' ? entry.folder === undefined
    : validFolder(entry.folder) && isAbsolute(entry.folder || '')
      && createHash('sha256').update(entry.folder || '').digest('hex') === entry.id;
}

/** @param {string} folder */
export async function assertProjectFolder(folder) {
  try {
    if (await realpath(folder) !== folder) { throw new Error('The folder now resolves to a different location. Reconnect it explicitly.'); }
    let directory = await opendir(folder);
    await directory.close();
  } catch (error) { throw new CommandError(`Project folder is unavailable: ${folder}. ${errorMessage(error)}`); }
}
