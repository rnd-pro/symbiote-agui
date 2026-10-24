import { opendir, stat } from 'node:fs/promises';
import { CommandError } from '../../shared/command-error.js';
import { errorMessage, hasErrorCode } from '../../shared/system-error.js';
import { cacheDisplayName, explorerRoot, hiddenPath, resolveExplorerPath, validExplorerPath } from './access.js';
import { EXPLORER_DIRECTORY_LIMIT, EXPLORER_PAGE_SIZE } from './constants.js';

/**
 * @param {string} projectId
 * @param {string} [path]
 * @param {number} [offset]
 * @param {boolean} [showHidden]
 * @returns {Promise<import('../../../types/explorer.js').ProjectDirectory>}
 */
export async function listProjectEntries(projectId, path = '', offset = 0, showHidden = false) {
  if (!validExplorerPath(path) || !Number.isSafeInteger(offset) || offset < 0 || offset > EXPLORER_DIRECTORY_LIMIT) {
    throw new CommandError('Choose a valid project directory and page.');
  }
  let scope = await explorerRoot(projectId);
  /** @type {import('../../../types/explorer.js').ProjectEntry[]} */
  let entries = [];
  try {
    if (scope.cache && path) { throw new CommandError('Default contains saved definitions, not browsable subdirectories.'); }
    let directoryPath = await resolveExplorerPath(scope, path, showHidden);
    let directory = await opendir(directoryPath);
    let scanned = 0;
    for await (let entry of directory) {
      if (++scanned > EXPLORER_DIRECTORY_LIMIT) { throw new CommandError(`This directory exceeds the ${EXPLORER_DIRECTORY_LIMIT}-entry browsing limit.`); }
      let name = scope.cache ? cacheDisplayName(entry.name) : entry.name;
      if (!name || !scope.cache && !showHidden && hiddenPath(name)) { continue; }
      let child = path ? `${path}/${name}` : name;
      if (!validExplorerPath(child)) { continue; }
      try {
        let resolved = await resolveExplorerPath(scope, child, showHidden);
        let info = entry.isSymbolicLink() ? await stat(resolved) : entry;
        if (scope.cache && !info.isFile()) { continue; }
        entries.push({
          name,
          path: child,
          kind: info.isDirectory() ? 'directory' : info.isFile() ? 'file' : 'unavailable',
          ...(!info.isDirectory() && !info.isFile() ? {
            error: 'This entry is not a regular file or directory.',
          } : {}),
        });
      } catch (error) {
        entries.push({
          name,
          path: child,
          kind: 'unavailable',
          error: errorMessage(error),
        });
      }
    }
    // Recheck after iteration as well as before opening the directory.
    if (await resolveExplorerPath(scope, path, showHidden) !== directoryPath) { throw new CommandError('The project directory changed. Refresh to retry.'); }
  } catch (error) {
    if (!scope.cache || path || !hasErrorCode(error, 'ENOENT')) { throw error; }
  }
  entries.sort((left, right) => Number(right.kind === 'directory') - Number(left.kind === 'directory')
    || left.name.localeCompare(right.name, 'en') || left.path.localeCompare(right.path, 'en'));
  return {
    projectId,
    path,
    entries: entries.slice(offset, offset + EXPLORER_PAGE_SIZE),
    ...(offset + EXPLORER_PAGE_SIZE < entries.length ? {
      nextOffset: offset + EXPLORER_PAGE_SIZE,
    } : {}),
  };
}
