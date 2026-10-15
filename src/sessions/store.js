import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { CommandError } from '../shared/command-error.js';
import { ERROR_CODE, EXIT_CODE } from '../shared/constants.js';
import { hasErrorCode } from '../shared/system-error.js';
import { assertSessionId } from './identity.js';

export function getStateRoot() {
  return process.env.AGUI_STATE_DIR
    ? resolve(process.env.AGUI_STATE_DIR)
    : join(homedir(), '.symbiote-agui', 'sessions');
}

/** @param {string} sessionId */
function sessionPath(sessionId) {
  assertSessionId(sessionId);
  return join(getStateRoot(), Buffer.from(sessionId).toString('hex'));
}

/** @param {import('../../types/session.js').SessionRecord} record */
export function recordDirectory(record) {
  return join(sessionPath(record.sessionId), record.instanceId);
}

/**
 * @param {string} sessionId
 * @param {import('../../types/browser.js').BrowserOptions} browser
 * @returns {Promise<import('../../types/session.js').SessionRecord>}
 */
export async function reserveSession(sessionId, browser) {
  let root = getStateRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  let candidate = await mkdtemp(join(root, '.pending-'));
  let record = {
    sessionId,
    instanceId: randomUUID(),
    controlToken: randomBytes(32).toString('hex'),
    pid: process.pid,
    launcherPid: process.pid,
    browser,
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
export async function readSession(sessionId) {
  let directory = sessionPath(sessionId);

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
  let directory = recordDirectory(record);
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
