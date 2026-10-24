import { mkdir } from 'node:fs/promises';
import { openFolder } from '../browser/open-folder.js';
import { getDefaultDefinitionFolder } from '../library/paths.js';
import { CommandError } from '../shared/command-error.js';
import { errorMessage } from '../shared/system-error.js';
import { assertProjectFolder } from './identity.js';
import { registeredProject } from './registry.js';

/**
 * @param {string} projectId
 * @param {(folder: string) => Promise<unknown>} [open]
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function openProjectFolder(projectId, open = openFolder) {
  let project = await registeredProject(projectId);
  let folder = project.folder || getDefaultDefinitionFolder();
  try {
    if (project.folder) { await assertProjectFolder(folder); }
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
