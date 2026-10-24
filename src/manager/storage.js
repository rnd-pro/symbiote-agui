import { isAbsolute, join } from 'node:path';
import { configureFolder, getProjectSettings } from '../config/settings.js';
import { getDefaultStateRoot } from '../sessions/store.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';
import { rememberProject } from '../projects/registry.js';
import { openProjectManager } from './launcher.js';

/**
 * @param {import('../../types/manager.js').ManagerRecord | undefined} record
 * @returns {import('../../types/manager.js').ManagerStorageSettings}
 */
export function managerStorageSettings(record) {
  let projectDirectory = record?.projectDirectory;
  let editable = !!projectDirectory && isAbsolute(projectDirectory) && record?.settings.source === 'project';
  let settings = record?.settings;
  let message = editable
    ? 'Folder changes open a manager for the selected storage. Existing files, sessions, and committed data stay in their original scope.'
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
    defaultFolder: join(getDefaultStateRoot(), '.cache'),
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
    await rememberProject(getProjectSettings(record.projectDirectory).folder);
    return {
      ok: true,
      manager: await openProjectManager(record.projectDirectory),
    };
  } catch (error) {
    throw new CommandError(`The save folder was saved, but its manager could not open. Run npx symbiote-agui manager from your project. ${error instanceof Error ? error.message : String(error)}`, ERROR_CODE.START_FAILED, EXIT_CODE.RUNTIME_ERROR);
  }
}
