import { isAbsolute } from 'node:path';
import { configureFolder, getProjectSettings } from '../config/settings.js';
import { getDefaultDefinitionFolder } from '../library/paths.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { rememberProject, listProjects } from '../projects/registry.js';

/**
 * @param {import('../../types/manager.js').ManagerRecord | undefined} record
 * @returns {import('../../types/manager.js').ManagerStorageSettings}
 */
export function managerStorageSettings(record) {
  let projectDirectory = record?.projectDirectory;
  let editable = !!projectDirectory && isAbsolute(projectDirectory) && record?.settings.source === 'project';
  let settings = record?.settings;
  let message = editable
    ? 'Folder changes select its contents in this manager. Existing files, sessions, and committed data stay in their folders.'
    : record?.settings.source === 'environment'
      ? 'AGUI_LIBRARY_DIR overrides this setting. Unset it, stop the manager, and launch it again from your project to choose a save folder.'
      : 'Reopen the manager from your project to enable save-folder settings.';
  if (editable) {
    try { settings = getProjectSettings(projectDirectory); }
    catch (error) {
      editable = false;
      message = `Save-folder settings are unavailable. Fix the project configuration and refresh. ${errorMessage(error)}`;
    }
  }
  return {
    editable,
    folder: settings?.folder,
    defaultFolder: getDefaultDefinitionFolder(),
    projectDirectory: record?.projectDirectory,
    configPath: settings?.configPath,
    message,
  };
}

/**
 * @param {import('../../types/manager.js').ManagerRecord | undefined} record
 * @param {string | null} folder
 */
export async function configureManagerStorage(record, folder) {
  let storage = managerStorageSettings(record);
  if (!storage.editable || !record?.projectDirectory) { throw new CommandError(storage.message); }
  if (storage.configPath !== record.settings.configPath) {
    throw new CommandError('The project configuration location changed. Reopen the manager before changing its save folder.');
  }
  await configureFolder(folder ?? undefined, record.projectDirectory);
  try {
    let folder = getProjectSettings(record.projectDirectory).folder;
    let project = await rememberProject(folder, true);
    return {
      ok: true,
      project,
      projects: await listProjects(folder),
    };
  } catch (error) {
    throw new CommandError(`The save folder was saved, but its contents could not be selected. Refresh Projects before trying again. ${error instanceof Error ? error.message : String(error)}`, ERROR_CODE.START_FAILED, EXIT_CODE.RUNTIME_ERROR);
  }
}
