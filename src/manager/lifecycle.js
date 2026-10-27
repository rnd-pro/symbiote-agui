import { spawn } from 'node:child_process';
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { getDefaultStateRoot, isProcessAlive } from '../sessions/store.js';
import { getSettings } from '../config/settings.js';
import { STARTUP_TIMEOUT_MS } from '../sessions/constants.js';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';
import { openPage } from '../browser/open.js';
import { managerDirectory, readManager, releaseManager, reserveManager, writeManager } from './registry.js';
import { rememberProject } from '../projects/registry.js';
import { requestManager, stopManagerRecord } from './client.js';
import { retireFolderManagers } from './migration.js';
import { MANAGER_PROTOCOL_VERSION } from './constants.js';

/** @returns {Promise<import('../../types/manager.js').ManagerStatus>} */
export async function statusManager() {
  let record = await readManager();
  if (!record || !isProcessAlive(record.pid)) {
    if (record) { await releaseManager(record); }
    return {
      active: false,
      stateRoot: getDefaultStateRoot(),
      settings: getSettings(),
    };
  }
  try { await requestManager(record, 'status'); }
  catch { throw new CommandError('Manager is starting or unreachable. Inspect its manager.log before retrying.', ERROR_CODE.SESSION_UNREACHABLE, EXIT_CODE.RUNTIME_ERROR); }
  return {
    active: true,
    pid: record.pid,
    url: record.url,
    stateRoot: record.stateRoot,
    settings: record.settings,
    protocolVersion: record.protocolVersion,
  };
}

export async function stopManager() {
  let status = await statusManager();
  if (!status.active) { return status; }
  let record = await readManager();
  if (!record) { return { ...status, active: false, url: undefined, pid: undefined }; }
  await stopManagerRecord(record);
  return {
    ...status,
    active: false,
    url: undefined,
    pid: undefined,
  };
}

/** @param {boolean} [open] */
export async function restartManager(open = true) {
  await stopManager();
  return startManager(open);
}

/** @param {import('node:child_process').ChildProcess} child */
function waitForManager(child) {
  return new Promise((resolve, reject) => {
    let finish = (/** @type {Error | undefined} */ error) => {
      clearTimeout(timer);
      child.off('error', onError);
      child.off('exit', onExit);
      child.off('message', onMessage);
      error ? reject(error) : resolve(undefined);
    };
    let onError = (/** @type {Error} */ error) => finish(error);
    let onExit = () => finish(new Error('Manager exited during startup.'));
    let onMessage = (/** @type {unknown} */ message) => {
      let reply = /** @type {{ kind: string; message?: string }} */ (message);
      finish(reply.kind === 'ready' ? undefined : new Error(reply.message || 'Invalid startup response.'));
    };
    let timer = setTimeout(() => finish(new Error('Manager startup timed out.')), STARTUP_TIMEOUT_MS);
    child.on('error', onError);
    child.on('exit', onExit);
    child.on('message', onMessage);
  });
}

async function launchManager() {
  let record;
  try { record = await reserveManager(); }
  catch (error) {
    if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].some((code) => hasErrorCode(error, code))) { throw error; }
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { if ((await statusManager()).active) { return; } } catch { /* The other launcher is still starting. */ }
      await delay(100);
    }
    throw new CommandError('Another manager is starting or unreachable.', ERROR_CODE.START_FAILED, EXIT_CODE.RUNTIME_ERROR);
  }
  /** @type {import('node:fs/promises').FileHandle | undefined} */
  let log;
  /** @type {import('node:child_process').ChildProcess | undefined} */
  let child;
  try {
    log = await open(join(managerDirectory(record), 'manager.log'), 'a', 0o600);
    child = spawn(process.execPath, [fileURLToPath(new URL('./worker.js', import.meta.url))], {
      cwd: managerDirectory(record),
      env: {
        ...process.env,
        AGUI_STATE_DIR: getDefaultStateRoot(),
        AGUI_WORKER_STATE_DIR: '',
        AGUI_LIBRARY_DIR: record.settings.folder || '',
      },
      detached: true,
      stdio: ['ignore', log.fd, log.fd, 'ipc'],
    });
    let ready = waitForManager(child);
    void ready.catch(() => {});
    if (!child.pid) { await ready; throw new Error('Manager process was not created.'); }
    record.pid = child.pid;
    await writeManager(record);
    await new Promise((resolve, reject) => child?.send(record, (error) => error ? reject(error) : resolve(undefined)));
    await ready;
    child.unref();
  } catch (error) {
    child?.kill();
    await releaseManager(record);
    throw new CommandError(`Could not start manager: ${error instanceof Error ? error.message : error}`, ERROR_CODE.START_FAILED, EXIT_CODE.RUNTIME_ERROR);
  } finally { await log?.close(); }
}

/** @param {boolean} open */
export async function startManager(open = true) {
  let project = await rememberProject(getSettings().folder, true);
  await retireFolderManagers();
  let existing = await readManager();
  if (existing && isProcessAlive(existing.pid) && existing.protocolVersion !== MANAGER_PROTOCOL_VERSION) {
    await stopManagerRecord(existing);
    existing = undefined;
  }
  if (!existing || !isProcessAlive(existing.pid)) { await launchManager(); }
  else if (!existing.url) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { if ((await statusManager()).active) { break; } } catch { /* Wait for the current launcher to publish its endpoint. */ }
      await delay(100);
    }
  }
  else { await statusManager(); }
  let status = await statusManager();
  let record = await readManager();
  if (!record?.url) { throw new Error('Manager did not become ready.'); }
  let launch = new URL(record.url);
  if (project.id !== 'default') { launch.searchParams.set('project', project.id); }
  launch.hash = record.token;
  let result = {
    ...status,
    launchUrl: launch.href,
  };
  if (open) {
    try { await openPage(result.launchUrl); return { ...result, opened: true }; }
    catch { return { ...result, opened: false, warning: 'Open launchUrl once to authorize this browser automatically.' }; }
  }
  return result;
}
