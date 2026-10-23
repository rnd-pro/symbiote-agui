import { fork } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import { configureFolder, getProjectSettings } from '../config/settings.js';
import { getDefaultStateRoot } from '../sessions/store.js';
import { STARTUP_TIMEOUT_MS } from '../sessions/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { errorMessage } from '../shared/system-error.js';

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
 * @param {string} projectDirectory
 * @returns {Promise<import('../../types/manager.js').ManagerStatus>}
 */
function openProjectManager(projectDirectory) {
  let environment = {
    ...process.env,
  };
  // Only the new launcher resolves the changed project scope. Live workers stay pinned.
  delete environment.AGUI_LIBRARY_DIR;
  delete environment.AGUI_WORKER_STATE_DIR;
  let child = fork(new URL('./storage-launcher.js', import.meta.url), [
  ], {
    cwd: projectDirectory,
    env: environment,
    execArgv: [
    ],
    stdio: [
      'ignore',
      'ignore',
      'ignore',
      'ipc',
    ],
  });
  return new Promise((resolve, reject) => {
    /**
     * @param {Error | undefined} error
     * @param {import('../../types/manager.js').ManagerStatus | undefined} result
     */
    function finish(error, result) {
      clearTimeout(timer);
      child.off('error', onError);
      child.off('exit', onExit);
      child.off('message', onMessage);
      if (error) { reject(error); }
      else if (result) { resolve(result); }
    }
    let onError = (/** @type {Error} */ error) => finish(error, undefined);
    let onExit = () => finish(new Error('The manager launcher exited before returning its URL.'), undefined);
    let onMessage = (/** @type {unknown} */ message) => {
      let reply = /** @type {{ ok: boolean; result?: import('../../types/manager.js').ManagerStatus; message?: string }} */ (message);
      if (!reply.ok || !reply.result?.active || !reply.result.launchUrl) {
        finish(new Error(reply.message || 'The manager did not become ready.'), undefined);
        return;
      }
      finish(undefined, reply.result);
    };
    let timer = setTimeout(() => {
      child.kill();
      finish(new Error('Opening the selected storage timed out.'), undefined);
    }, STARTUP_TIMEOUT_MS + 5_000);
    child.once('error', onError);
    child.once('exit', onExit);
    child.once('message', onMessage);
  });
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
    return {
      ok: true,
      manager: await openProjectManager(record.projectDirectory),
    };
  } catch (error) {
    throw new CommandError(`The save folder was saved, but its manager could not open. Run npx symbiote-agui manager from your project. ${error instanceof Error ? error.message : String(error)}`, ERROR_CODE.START_FAILED, EXIT_CODE.RUNTIME_ERROR);
  }
}
