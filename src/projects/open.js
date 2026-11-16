import { lstat, mkdir } from 'node:fs/promises';
import { openFolder } from '../browser/open-folder.js';
import { getDefaultDefinitionFolder } from '../library/paths.js';
import { CommandError } from '../shared/command-error.js';
import { errorMessage } from '../shared/system-error.js';
import { assertProjectFolder } from './identity.js';
import { registeredProject } from './registry.js';
import { explorerRoot, resolveExplorerPath } from './explorer/access.js';

/**
 * @param {string} projectId
 * @param {(folder: string) => Promise<unknown>} [open]
 * @param {{path?: string; showHidden?: boolean}} [options]
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function openProjectFolder(projectId, open = openFolder, options = {}) {
  let project = await registeredProject(projectId);
  let folder = project.folder || getDefaultDefinitionFolder();
  try {
    if (options.path) {
      let scope = await explorerRoot(projectId);
      folder = await resolveExplorerPath(scope, options.path, !!options.showHidden);
      if (!(await lstat(folder)).isDirectory()) { throw new CommandError('Choose a directory to open.'); }
      if (await resolveExplorerPath(scope, options.path, !!options.showHidden) !== folder) {
        throw new CommandError('The directory changed. Refresh before opening it.');
      }
    } else if (project.folder) { await assertProjectFolder(folder); }
    else {
      await mkdir(folder, {
        recursive: true,
        mode: 0o700,
      });
    }
    await open(folder);
  } catch (error) {
    throw new CommandError(`Could not request opening the project folder. ${errorMessage(error)} Folder: ${folder}. Open this path manually on the Node host.`);
  }
  return {
    ok: true,
    project,
    folderPath: folder,
  };
}
