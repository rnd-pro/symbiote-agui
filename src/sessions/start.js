import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';
import { withTimeout } from '../shared/timeout.js';
import { SHUTDOWN_TIMEOUT_MS, STARTUP_TIMEOUT_MS } from './constants.js';
import { requestSession } from './client.js';
import { getStateRoot, isProcessAlive, readSession, recordDirectory, releaseSession, reserveSession, writeSession } from './store.js';
import { withAuthorizationUrl } from './page-url.js';

/**
 * @param {string} sessionId
 */
async function reserveAvailableSession(sessionId) {
  try {
    return await reserveSession(sessionId);
  } catch (error) {
    if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].some((code) => hasErrorCode(error, code))) {
      throw error;
    }
  }

  let existing = await readSession(sessionId);

  if (existing?.controlUrl) {
    try {
      await requestSession(existing, 'status');
      throw new CommandError(`Session ${sessionId} already exists. Use status or stop.`, ERROR_CODE.SESSION_EXISTS, EXIT_CODE.RUNTIME_ERROR);
    } catch (error) {
      if (error instanceof CommandError && error.code === ERROR_CODE.SESSION_EXISTS) {
        throw error;
      }
    }
  }

  existing = await readSession(sessionId);

  if (existing && isProcessAlive(existing.pid)) {
    throw new CommandError(`Session ${sessionId} already exists or is starting. Use status or stop.`, ERROR_CODE.SESSION_EXISTS, EXIT_CODE.RUNTIME_ERROR);
  }

  if (existing) {
    await releaseSession(existing);
  }

  try {
    return await reserveSession(sessionId);
  } catch (error) {
    if (['EEXIST', 'ENOTEMPTY', 'EPERM'].some((code) => hasErrorCode(error, code))) {
      throw new CommandError(`Another start reserved session ${sessionId}.`, ERROR_CODE.SESSION_EXISTS, EXIT_CODE.RUNTIME_ERROR);
    }
    throw error;
  }
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @returns {Promise<import('../../types/session.js').SessionStatus>}
 */
function waitForStartup(child) {
  return new Promise((resolve, reject) => {
    let timer = setTimeout(() => finish(new CommandError('Session startup timed out.', ERROR_CODE.START_TIMEOUT, EXIT_CODE.RUNTIME_ERROR)), STARTUP_TIMEOUT_MS);

    /**
     * @param {Error | undefined} error
     * @param {import('../../types/session.js').SessionStatus} [result]
     */
    function finish(error, result) {
      clearTimeout(timer);
      child.off('error', onError);
      child.off('exit', onExit);
      child.off('message', onMessage);
      if (error) {
        reject(error);
      } else if (result) {
        resolve(result);
      }
    }

    /** @param {Error} error */
    function onError(error) { finish(error); }
    function onExit() { finish(new Error('The session worker exited before becoming ready.')); }
    /** @param {unknown} message */
    function onMessage(message) {
      let reply = /** @type {import('../../types/session.js').WorkerReply} */ (message);
      reply.kind === 'ready' ? finish(undefined, reply.result) : finish(new Error(reply.message));
    }

    child.on('error', onError);
    child.on('exit', onExit);
    child.on('message', onMessage);
  });
}

/**
 * @param {string} sessionId
 */
export async function startSession(sessionId) {
  let record = await reserveAvailableSession(sessionId);
  /** @type {import('node:child_process').ChildProcess | undefined} */
  let child;
  /** @type {import('node:fs/promises').FileHandle | undefined} */
  let log;

  try {
    log = await open(join(recordDirectory(record), 'worker.log'), 'a', 0o600);
    child = spawn(process.execPath, [fileURLToPath(new URL('./worker.js', import.meta.url))], {
      cwd: recordDirectory(record),
      env: { ...process.env, AGUI_STATE_DIR: getStateRoot() },
      detached: true,
      stdio: ['ignore', log.fd, log.fd, 'ipc'],
    });
    let startup = waitForStartup(child);
    // Observe rejection immediately, including failures before the boot message is sent.
    void startup.catch(() => {});

    if (!child.pid) {
      await startup;
      throw new Error('Could not spawn the session worker.');
    }

    record.pid = child.pid;
    await writeSession(record);
    await new Promise((resolve, reject) => {
      child?.send(record, (error) => error ? reject(error) : resolve(undefined));
    });
    let result = await startup;
    child.unref();
    return withAuthorizationUrl(result, record.pageToken);
  } catch (error) {
    if (child?.pid && child.exitCode === null && child.signalCode === null) {
      let exited = once(child, 'exit');
      if (child.connected) {
        child.send('abort', () => {});
      }
      try {
        await withTimeout(exited, SHUTDOWN_TIMEOUT_MS, 'Worker cleanup timed out.');
      } catch {
        child.kill('SIGKILL');
        await withTimeout(exited, SHUTDOWN_TIMEOUT_MS, 'Worker did not exit.');
      }
    }
    await releaseSession(record);
    if (error instanceof CommandError) {
      throw error;
    }
    throw new CommandError(`Could not start session ${sessionId}: ${error instanceof Error ? error.message : error}.`, ERROR_CODE.START_FAILED, EXIT_CODE.RUNTIME_ERROR);
  } finally {
    await log?.close();
  }
}
