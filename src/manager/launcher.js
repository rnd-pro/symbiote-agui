import { fork } from 'node:child_process';
import { STARTUP_TIMEOUT_MS } from '../sessions/constants.js';

/**
 * @param {string} projectDirectory
 * @param {string | null} [folder]
 * @returns {Promise<import('../../types/manager.js').ManagerStatus>}
 */
export function openProjectManager(projectDirectory, folder) {
  let environment = {
    ...process.env,
  };
  // Resolve the destination in a child; every live worker retains its own scope.
  if (folder === undefined) { delete environment.AGUI_LIBRARY_DIR; }
  else { environment.AGUI_LIBRARY_DIR = folder || ''; }
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
