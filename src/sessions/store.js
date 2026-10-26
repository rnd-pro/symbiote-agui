import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';
import { sessionKey } from './identity.js';
import { getSettings } from '../config/settings.js';
import { currentStorageScope } from '../config/storage-scope.js';

export function getDefaultStateRoot() {
  return process.env.AGUI_STATE_DIR
    ? resolve(process.env.AGUI_STATE_DIR)
    : join(homedir(), '.symbiote-agui', 'sessions');
}

export function getStateRoot() {
  let scope = currentStorageScope();
  if (scope) { return stateRootForFolder(scope.folder); }
  if (process.env.AGUI_WORKER_STATE_DIR) { return resolve(process.env.AGUI_WORKER_STATE_DIR); }
  return stateRootForFolder(getSettings().folder);
}

/** @param {string} [folder] */
export function stateRootForFolder(folder) {
  let root = getDefaultStateRoot();
  return folder ? join(root, '.libraries', createHash('sha256').update(folder).digest('hex')) : root;
}

/**
 * @param {string} sessionId
 * @param {string} [root]
 */
function sessionPath(sessionId, root = getStateRoot()) {
  return join(root, sessionKey(sessionId));
}

/** @param {import('../../types/session.js').SessionRecord} record */
export function recordDirectory(record) {
  return join(sessionPath(record.sessionId), record.instanceId);
}

/**
 * @param {string} sessionId
 * @returns {Promise<import('../../types/session.js').SessionRecord>}
 */
export async function reserveSession(sessionId) {
  let root = getStateRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  let candidate = await mkdtemp(join(root, '.pending-'));
  let record = {
    sessionId,
    instanceId: randomUUID(),
    controlToken: randomBytes(32).toString('hex'),
    pid: process.pid,
    launcherPid: process.pid,
  };

  try {
    let generation = join(candidate, record.instanceId);
    await mkdir(generation, { mode: 0o700 });
    await writeFile(join(generation, 'session.json'), JSON.stringify(record), { mode: 0o600 });
    // Publish a complete, nonempty directory so competing starts never see a partial reservation.
    await rename(candidate, sessionPath(sessionId));
    return record;
  } finally {
    await rm(candidate, { recursive: true, force: true });
  }
}

/**
 * @param {string} sessionId
 * @returns {Promise<import('../../types/session.js').SessionRecord | undefined>}
 */
export function readSession(sessionId) {
  return readScopedSession(sessionId, getStateRoot());
}

/**
 * @param {string} sessionId
 * @param {string} root
 * @returns {Promise<import('../../types/session.js').SessionRecord | undefined>}
 */
export async function readScopedSession(sessionId, root) {
  let directory = sessionPath(sessionId, root);

  try {
    let entries = await readdir(directory);
    let instanceId = entries[0];

    if (entries.length !== 1 || !instanceId || !/^[a-f0-9-]{36}$/.test(instanceId)) {
      throw new Error('Invalid session directory.');
    }

    let record = JSON.parse(await readFile(join(directory, instanceId, 'session.json'), 'utf8'));

    if (
      record.sessionId !== sessionId
      || record.instanceId !== instanceId
      || !/^[a-f0-9]{64}$/.test(record.controlToken)
      || !Number.isSafeInteger(record.pid) || record.pid <= 0
      || !Number.isSafeInteger(record.launcherPid) || record.launcherPid <= 0
      || (record.controlUrl && !/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(record.controlUrl))
    ) {
      throw new Error('Invalid session metadata.');
    }

    return record;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return undefined;
    }

    throw new CommandError(`Cannot read session ${sessionId}. Inspect ${directory}.`, ERROR_CODE.SESSION_UNREACHABLE, EXIT_CODE.RUNTIME_ERROR);
  }
}

/** @param {import('../../types/session.js').SessionRecord} record */
export async function writeSession(record) {
  let directory = recordDirectory(record);
  let temporary = join(directory, 'session.json.tmp');
  await writeFile(temporary, JSON.stringify(record), { mode: 0o600 });
  await rename(temporary, join(directory, 'session.json'));
}

/** @param {import('../../types/session.js').SessionRecord} record */
export async function releaseSession(record) {
  return releaseScopedSession(record, getStateRoot());
}

/**
 * @param {import('../../types/session.js').SessionRecord} record
 * @param {string} root
 */
export async function releaseScopedSession(record, root) {
  let directory = join(sessionPath(record.sessionId, root), record.instanceId);
  await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });

  try {
    // A newer generation, if present, prevents removal of its parent directory.
    await rmdir(dirname(directory));
  } catch (error) {
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].some((code) => hasErrorCode(error, code))) {
      throw error;
    }
  }
}

/** @param {number} pid */
export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !hasErrorCode(error, 'ESRCH');
  }
}
