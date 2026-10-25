import { pickFolder } from '../browser/pick-folder.js';
import { CommandError } from '../shared/command-error.js';
import { errorMessage } from '../shared/system-error.js';
import { connectProject } from './registry.js';

/**
 * @param {string} directory
 * @param {() => Promise<string | undefined>} [pick]
 * @returns {Promise<import('../../types/manager.js').ManagerResult>}
 */
export async function chooseProject(directory, pick = pickFolder) {
  try {
    let folder = await pick();
    return folder ? {
      ok: true,
      project: await connectProject(folder, directory),
    } : {
      ok: true,
      cancelled: true,
    };
  } catch (error) {
    throw new CommandError(`Could not choose a project folder. ${errorMessage(error)} Use Enter folder path instead.`);
  }
}
